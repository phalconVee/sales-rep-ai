// src/services/ai/behavioral.prediction.service.ts
import { openAIService } from './openai.service';
import { ShopifyPlatform } from '../platforms/shopify.platform';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';

// Interfaces
export interface BehaviorData {
  timeOnPage: number;          // seconds
  scrollDepth: number;         // percentage (0-100)
  mouseMovements: number;      // count of movements
  pageInactivity: number;      // seconds
  pageViews: number;          // total pages viewed in session
  previousPages: string[];     // array of page URLs
  cartValue?: number;         // current cart value
  productViews: number;       // products viewed in session
  exitIntent: boolean;        // mouse moved to close tab/window
  currentPage: string;        // current page URL
  deviceType: string;         // mobile, tablet, desktop
  referrer?: string;         // where user came from
  sessionDuration: number;    // total session time in seconds
}

export interface InterventionStrategy {
  shouldIntervene: boolean;
  confidence: number;         // 0-1 score
  reason: string;            // explanation for the decision
  suggestedMessage?: string; // message to show user
  interventionType: InterventionType;
  priority: number;          // 1-5, with 5 being highest
  timing: 'immediate' | 'delayed';
}

export type InterventionType = 
  | 'discount'
  | 'product_recommendation'
  | 'help_offer'
  | 'cart_reminder'
  | 'email_collection'
  | null;

interface BehaviorLog {
  id: number;
  visitor_id: string;
  shop_id: number;
  behavior_data: BehaviorData;
  intervention?: InterventionStrategy;
  successful?: boolean;
  created_at: Date;
}

export class BehavioralPredictionService {
  private readonly INACTIVITY_THRESHOLD = 30; // seconds
  private readonly SCROLL_DEPTH_THRESHOLD = 70; // percentage
  private readonly MIN_SESSION_TIME = 10; // seconds
  private readonly HIGH_INTENT_CART_VALUE = 50; // currency units
  
  constructor(private platform: ShopifyPlatform) {}

  async analyzeEngagement(
    visitorId: string,
    shopId: number,
    behaviorData: BehaviorData
  ): Promise<InterventionStrategy> {
    try {
      // Log behavior data
      await this.logBehaviorData(visitorId, shopId, behaviorData);

      // Get additional context
      const cart = await this.platform.getCart(visitorId);
      const storeSettings = await this.platform.getStoreSettings();
      const visitorHistory = await this.getVisitorHistory(visitorId, shopId);

      // Enrich behavior data with context
      const enrichedData = {
        ...behaviorData,
        cartValue: cart.totalPrice,
        currency: storeSettings.currency,
        previousInterventions: visitorHistory.length,
        successfulInterventions: visitorHistory.filter(log => log.successful).length
      };

      // Generate AI analysis
      const intervention = await this.generateAIAnalysis(enrichedData);

      // Log the intervention
      await this.updateBehaviorLog(visitorId, shopId, intervention);

      return intervention;

    } catch (error) {
      logger.error('Error analyzing engagement:', error);
      throw error;
    }
  }

  private async logBehaviorData(
    visitorId: string,
    shopId: number,
    data: BehaviorData
  ): Promise<void> {
    try {
      await db('behavior_logs').insert({
        visitor_id: visitorId,
        shop_id: shopId,
        behavior_data: JSON.stringify(data),
        created_at: new Date()
      });
    } catch (error) {
      logger.error('Error logging behavior data:', error);
      throw error;
    }
  }

  private async updateBehaviorLog(
    visitorId: string,
    shopId: number,
    intervention: InterventionStrategy
  ): Promise<void> {
    try {
      await db('behavior_logs')
        .where({
          visitor_id: visitorId,
          shop_id: shopId
        })
        .orderBy('created_at', 'desc')
        .limit(1)
        .update({
          intervention: JSON.stringify(intervention)
        });
    } catch (error) {
      logger.error('Error updating behavior log:', error);
      throw error;
    }
  }

  async getVisitorHistory(visitorId: string, shopId: number): Promise<BehaviorLog[]> {
    try {
        const logs = await db('behavior_logs')
            .where({
                visitor_id: visitorId,
                shop_id: shopId
            })
            .orderBy('created_at', 'desc')
            .limit(10);

        return logs.map(log => ({
            ...log,
            behavior_data: typeof log.behavior_data === 'string' 
                ? JSON.parse(log.behavior_data)
                : log.behavior_data,
            intervention: log.intervention 
                ? (typeof log.intervention === 'string' 
                    ? JSON.parse(log.intervention) 
                    : log.intervention)
                : undefined
        }));
    } catch (error) {
        logger.error('Error fetching visitor history:', error);
        return [];
    }
  }

  private async generateAIAnalysis(
    enrichedData: BehaviorData & {
      currency: string;
      previousInterventions: number;
      successfulInterventions: number;
    }
  ): Promise<InterventionStrategy> {
    try {
      const prompt = this.constructAnalysisPrompt(enrichedData);
      
      const response = await openAIService.generateResponse([
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return this.parseAIResponse(response.content || '');
    } catch (error) {
      logger.error('Error generating AI analysis:', error);
      return this.getFallbackStrategy();
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert e-commerce behavioral analyst AI. Your role is to:
1. Analyze user behavior patterns to identify potential customer disengagement
2. Determine the best intervention strategy based on behavior signals
3. Suggest personalized intervention messages
4. Provide confidence scores for your recommendations

Consider these key factors:
- Time spent on page and total session duration
- Scroll depth and mouse movements
- Cart value and product views
- Page inactivity and exit intent
- Previous page views and navigation pattern
- Previous interventions and their success rate

Return your analysis in JSON format with fields:
{
  "shouldIntervene": boolean,
  "confidence": number (0-1),
  "reason": string,
  "suggestedMessage": string,
  "interventionType": "discount" | "product_recommendation" | "help_offer" | "cart_reminder" | "email_collection" | null,
  "priority": number (1-5),
  "timing": "immediate" | "delayed"
}`;
  }

  private constructAnalysisPrompt(data: any): string {
    return `Analyze this user behavior data:
${JSON.stringify(data, null, 2)}

Consider these thresholds:
- Inactivity threshold: ${this.INACTIVITY_THRESHOLD} seconds
- Scroll depth threshold: ${this.SCROLL_DEPTH_THRESHOLD}%
- Minimum session time: ${this.MIN_SESSION_TIME} seconds
- High intent cart value: ${this.HIGH_INTENT_CART_VALUE} ${data.currency}

Analyze the behavior and determine if and how we should intervene.`;
  }

  private parseAIResponse(response: string): InterventionStrategy {
    try {
      const jsonMatch = response.match(/{[\s\S]*}/);
      if (!jsonMatch) return this.getFallbackStrategy();

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        shouldIntervene: Boolean(parsed.shouldIntervene),
        confidence: Number(parsed.confidence) || 0,
        reason: String(parsed.reason),
        suggestedMessage: parsed.suggestedMessage,
        interventionType: this.validateInterventionType(parsed.interventionType),
        priority: this.validatePriority(parsed.priority),
        timing: this.validateTiming(parsed.timing)
      };
    } catch (error) {
      logger.error('Error parsing AI response:', error);
      return this.getFallbackStrategy();
    }
  }

  private validateInterventionType(type: string): InterventionType {
    const validTypes: InterventionType[] = [
      'discount',
      'product_recommendation',
      'help_offer',
      'cart_reminder',
      'email_collection',
      null
    ];
    return validTypes.includes(type as InterventionType) ? 
      type as InterventionType : null;
  }

  private validatePriority(priority: number): number {
    return Math.min(Math.max(Math.round(priority), 1), 5);
  }

  private validateTiming(timing: string): 'immediate' | 'delayed' {
    return timing === 'immediate' ? 'immediate' : 'delayed';
  }

  private getFallbackStrategy(): InterventionStrategy {
    return {
      shouldIntervene: false,
      confidence: 0,
      reason: 'Failed to generate intervention strategy',
      interventionType: null,
      priority: 1,
      timing: 'delayed'
    };
  }
}