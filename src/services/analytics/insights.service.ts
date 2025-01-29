// src/services/analytics/insights.service.ts
import { trackingService } from './tracking.service';
import { logger } from '../../utils/logger';

interface ConversionMetrics {
  totalVisitors: number;
  interactions: number;
  conversions: number;
  conversionRate: number;
}

interface EngagementMetrics {
  averageSessionDuration: number;
  averageInteractionsPerSession: number;
  bounceRate: number;
}

export class InsightsService {
  async getConversionMetrics(startTime: Date, endTime: Date): Promise<ConversionMetrics> {
    const events = trackingService.getUserEvents('all', startTime, endTime);
    const uniqueVisitors = new Set(events.map(e => e.userId)).size;
    const interactionEvents = events.filter(e => 
      ['message', 'click', 'scroll'].includes(e.eventType)
    );
    const conversionEvents = events.filter(e => e.eventType === 'conversion');

    return {
      totalVisitors: uniqueVisitors,
      interactions: interactionEvents.length,
      conversions: conversionEvents.length,
      conversionRate: uniqueVisitors ? (conversionEvents.length / uniqueVisitors) * 100 : 0
    };
  }

  async getEngagementMetrics(startTime: Date, endTime: Date): Promise<EngagementMetrics> {
    const events = trackingService.getUserEvents('all', startTime, endTime);
    const sessions = new Map<string, number>();
    const sessionInteractions = new Map<string, number>();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, 0);
        sessionInteractions.set(event.sessionId, 0);
      }

      if (['message', 'click', 'scroll'].includes(event.eventType)) {
        sessionInteractions.set(
          event.sessionId,
          (sessionInteractions.get(event.sessionId) || 0) + 1
        );
      }
    });

    const totalSessions = sessions.size;
    const bouncedSessions = Array.from(sessionInteractions.values())
      .filter(interactions => interactions === 0).length;

    return {
      averageSessionDuration: Array.from(sessions.values())
        .reduce((sum, duration) => sum + duration, 0) / totalSessions || 0,
      averageInteractionsPerSession: Array.from(sessionInteractions.values())
        .reduce((sum, interactions) => sum + interactions, 0) / totalSessions || 0,
      bounceRate: totalSessions ? (bouncedSessions / totalSessions) * 100 : 0
    };
  }

  async generateInsightsReport(startTime: Date, endTime: Date) {
    try {
      const [conversionMetrics, engagementMetrics] = await Promise.all([
        this.getConversionMetrics(startTime, endTime),
        this.getEngagementMetrics(startTime, endTime)
      ]);

      return {
        timeRange: { startTime, endTime },
        conversionMetrics,
        engagementMetrics
      };
    } catch (error) {
      logger.error('Error generating insights report:', error);
      throw error;
    }
  }
}

export const insightsService = new InsightsService();