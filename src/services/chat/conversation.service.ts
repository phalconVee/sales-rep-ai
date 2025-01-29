import { db } from '../../config/database';
import { logger } from '../../utils/logger';

export class ConversationService {
  
  async createConversation(data: {
    shopId: number;
    visitorId: string;
    source?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const [id] = await db('conversations').insert({
        shop_id: data.shopId,
        visitor_id: data.visitorId,
        status: 'active',
        last_message_at: new Date(),
        source: data.source,
        url: data.url,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      return id;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getActiveConversations(shopId: number) {
    return db('conversations')
      .where({ shop_id: shopId, status: 'active' })
      .orderBy('last_message_at', 'desc');
  }

  async getConversation(id: number) {
    return db('conversations')
        .where('id', id)
        .first();
  }

  async endConversation(id: number) {
    return db('conversations')
      .where('id', id)
      .update({
        status: 'ended',
        ended_at: new Date(),
        updated_at: new Date()
      });
  }

  async updateLastMessage(id: number) {
    return db('conversations')
      .where('id', id)
      .update({
        last_message_at: new Date(),
        updated_at: new Date()
      });
  }
}

export const conversationService = new ConversationService();