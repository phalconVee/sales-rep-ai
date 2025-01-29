// src/websocket/handlers/chat.handler.ts
import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { BehavioralPredictionService } from '../../services/ai/behavioral.prediction.service';
import { messageService } from '../../services/chat/message.service';
import { conversationService } from '../../services/chat/conversation.service';
import { ShopifyPlatform } from '../../services/platforms/shopify.platform';
import { openAIService } from '../../services/ai/openai.service';
import { AppError } from '../../middleware/error.middleware';

export enum ChatEvents {
  SESSION_INIT = 'session_init',
  MESSAGE = 'message',
  MESSAGE_RESPONSE = 'message_response',
  TYPING = 'typing',
  ERROR = 'error',
  BEHAVIOR_UPDATE = 'behavior_update',
  PROACTIVE_MESSAGE = 'proactive_message',
  CONVERSATION_CREATED = 'conversation_created',
  DISCONECT = 'disconect'
}

interface ChatMessage {
  content: string;
  sessionId?: string;
  shopId?: number;
  visitorId?: string;
  metadata?: Record<string, any>;
}

interface BehaviorUpdate {
  timeOnPage: number;
  scrollDepth: number;
  mouseMovements: number;
  pageInactivity: number;
  pageViews: number;
  previousPages: string[];
  cartValue?: number;
  productViews: number;
  exitIntent: boolean;
  currentPage: string;
  deviceType: string;
  referrer?: string;
  sessionDuration: number;
}

export function handleChatEvents(io: Server, socket: Socket): void {
    logger.info('New socket connection attempt', {
        id: socket.id,
        auth: socket.handshake.auth,
        headers: socket.handshake.headers
    });

  let typingTimeout: NodeJS.Timeout;
  let platform: ShopifyPlatform;
  let behavioralService: BehavioralPredictionService;

  // Handle initial authentication and service setup
  (async () => {
    try {
        const { shopId, platform: platformType, apiKey } = socket.handshake.auth;
        
        // Validate API key format
        if (!apiKey || !apiKey.startsWith('whrf_pk_')) {
            logger.error('Invalid API key:', apiKey);
            throw new AppError(401, 'Invalid API key format');
        }

        // Check against database
        const storeConfig = await db('store_configurations')
            .where({
                shop_id: shopId,
                api_key: apiKey,
                platform: platformType
            })
            .first();

        if (!storeConfig) {
            throw new AppError(401, 'Invalid store configuration or API key');
        }

        // Initialize platform
        platform = new ShopifyPlatform();
        await platform.initialize(shopId);
        
        // Initialize behavioral service
        behavioralService = new BehavioralPredictionService(platform);

        socket.data = {
            shopId,
            platform: platformType,
            verified: true,
            storeConfig,
            servicesInitialized: true
        };

        logger.info(`Services initialized for shop ${shopId}`);
        
        // Emit ready event to client
        socket.emit('services_ready', { status: 'ready' });

    } catch (error) {
        logger.error('Service initialization error:', error);
        handleError(socket, error);
        socket.disconnect();
    }
  })();

  socket.on(ChatEvents.SESSION_INIT, async (data) => {
    try {
        if (!socket.data?.servicesInitialized) {
            logger.warn('Services not initialized yet');
            socket.emit('services_status', { 
                status: 'not_ready',
                message: 'Waiting for services to initialize'
            });
            return;
        }

        const { shopId, visitorId, metadata } = data;
        
        socket.data.visitorId = visitorId;
        socket.data.metadata = metadata;

        const conversationId = await conversationService.createConversation({
            shopId,
            visitorId,
            source: 'chat_widget',
            url: metadata?.currentUrl,
            metadata
        });

        socket.data.conversationId = conversationId;
        socket.emit(ChatEvents.CONVERSATION_CREATED, { conversationId });

        logger.info(`Session initialized for shop ${shopId}, visitor ${visitorId}`);
    } catch (error) {
        logger.error('Error initializing session:', error);
        handleError(socket, error);
    }
  });

  socket.on(ChatEvents.SESSION_INIT, async (data) => {
    try {
        // Check if services are initialized
        if (!socket.data?.servicesInitialized) {
            throw new AppError(500, 'Services not initialized. Please reconnect.');
        }

        const { shopId, visitorId, metadata } = data;
        
        socket.data.visitorId = visitorId;
        socket.data.metadata = metadata;

        // Create initial conversation if needed
        if (!socket.data.conversationId) {
            const conversationId = await conversationService.createConversation({
                shopId,
                visitorId,
                source: 'chat_widget',
                url: metadata?.currentUrl,
                metadata
            });

            socket.data.conversationId = conversationId;
            socket.emit(ChatEvents.CONVERSATION_CREATED, { conversationId });
        }

        logger.info(`Session initialized for shop ${shopId}, visitor ${visitorId}`);
    } catch (error) {
        logger.error('Error initializing session:', error);
        handleError(socket, error);
    }
  });

  socket.on(ChatEvents.MESSAGE, async (data: ChatMessage) => {
    try {
      if (!data.content?.trim()) {
        throw new AppError(400, 'Message content is required');
      }

      // Handle initial message (conversation creation)
      if (!data.sessionId && data.shopId) {
        const conversationId = await conversationService.createConversation({
          shopId: data.shopId,
          visitorId: data.visitorId!,
          source: 'chat_widget',
          url: data.metadata?.currentUrl,
          metadata: data.metadata
        });

        socket.emit(ChatEvents.CONVERSATION_CREATED, { conversationId });
        logger.info(`New conversation created: ${conversationId}`);
        data.sessionId = conversationId.toString();
      }

      logger.info(`Processing message for conversation: ${data.sessionId}`);
      
      // Save user message
      const userMessageId = await messageService.createMessage({
        conversationId: parseInt(data.sessionId!),
        content: data.content,
        senderType: 'user',
        type: 'text'
      });

      // Update conversation last message timestamp
      await conversationService.updateLastMessage(parseInt(data.sessionId!));

      // Generate AI response
      socket.emit(ChatEvents.TYPING, { isTyping: true });

      // Get store context
      const storeContext = await getStoreContext(socket.data.shopId);

      // Generate AI response with context
      const aiResponse = await openAIService.generateResponse([
        {
            role: 'assistant',
            content: `You are a knowledgeable shopping assistant for ${storeContext.storeName}. 
            Store Details: ${JSON.stringify(storeContext.storeDetails)}
            Available Products: ${JSON.stringify(storeContext.products)}
            Your role:
            - Provide accurate product recommendations
            - Share current promotions when relevant
            - Assist with finding specific items
            - Guide through checkout process
            - Answer policy questions
            - Maintain brand voice and customer service standards
            Use this context to provide specific, relevant responses about ${storeContext.storeName}'s products and services.
            `
        },
        { role: 'user', content: data.content }
      ]);

      if (!aiResponse.content) {
        throw new AppError(500, 'Failed to generate response');
      }

      // Save AI response
      const responseId = await messageService.createMessage({
        conversationId: parseInt(data.sessionId!),
        content: aiResponse.content,
        senderType: 'assistant',
        type: 'text'
      });

      // Update conversation last message timestamp again
      await conversationService.updateLastMessage(parseInt(data.sessionId!));

      // Send response
      socket.emit(ChatEvents.MESSAGE_RESPONSE, {
        id: responseId,
        content: aiResponse.content,
        timestamp: new Date()
      });

    } catch (error) {
      handleError(socket, error);
    } finally {
      socket.emit(ChatEvents.TYPING, { isTyping: false });
    }
  });

  socket.on(ChatEvents.BEHAVIOR_UPDATE, async (data: BehaviorUpdate) => {
    try {
        if (!socket.data.servicesInitialized) {
            logger.warn('Services not initialized');
            return;
        }

        if (!behavioralService) {
            logger.warn('Behavioral service not available');
            return;
        }

        const visitorId = socket.data.visitorId;
        const shopId = socket.data.shopId;
        
        if (!visitorId || !shopId) {
            logger.warn('Missing visitor or shop ID for behavior update');
            return;
        }

        const intervention = await behavioralService.analyzeEngagement(
            visitorId,
            shopId,
            data
        );

        if (intervention?.shouldIntervene && intervention.confidence > 0.7) {
            socket.emit(ChatEvents.PROACTIVE_MESSAGE, {
                message: intervention.suggestedMessage,
                type: intervention.interventionType,
                timing: intervention.timing
            });
        }
    } catch (error) {
        logger.error('Error processing behavior update:', error);
    }
  });

  socket.on(ChatEvents.TYPING, (data: { isTyping: boolean }) => {
    clearTimeout(typingTimeout);
    
    socket.broadcast.emit(ChatEvents.TYPING, {
      sessionId: socket.data.sessionId,
      isTyping: data.isTyping
    });

    if (data.isTyping) {
      typingTimeout = setTimeout(() => {
        socket.broadcast.emit(ChatEvents.TYPING, {
          sessionId: socket.data.sessionId,
          isTyping: false
        });
      }, 3000);
    }
  });

  socket.on(ChatEvents.DISCONECT, () => {
    logger.info(`Client disconnected: ${socket.id}`);
    clearTimeout(typingTimeout);
  });

  socket.on(ChatEvents.ERROR, (error: Error) => {
    handleError(socket, error);
  });
}

function handleError(socket: Socket, error: any): void {
  const errorMessage = error instanceof AppError ? 
    error.message : 'An unexpected error occurred';
  
  logger.error('Socket error:', error);
  
  socket.emit(ChatEvents.ERROR, {
    message: errorMessage,
    code: error instanceof AppError ? error.statusCode : 500
  });
}

async function getStoreContext(shopId: number) {
    const storeConfig = await db('store_configurations')
        .where('shop_id', shopId)
        .first();

    const platform = new ShopifyPlatform();
    await platform.initialize(shopId);

    // Get store data
    const storeSettings = await platform.getStoreSettings();
    const products = await platform.getProducts();
    
    return {
        storeName: storeSettings.name,
        storeDetails: storeSettings,
        products: products,
    };
}