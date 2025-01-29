import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

export class MessageService {
  async createMessage(message: {
    conversationId: number;
    content: string;
    senderType: 'user' | 'assistant';
    type: string;
    metadata?: Record<string, unknown>;
  }) {
    // Validate conversation_id
    if (!message.conversationId || isNaN(message.conversationId)) {
      throw new AppError(400, 'Invalid conversation ID');
    }

    try {
      // Verify conversation exists
      const conversation = await db('conversations')
        .where('id', message.conversationId)
        .first();

      if (!conversation) {
        throw new AppError(404, 'Conversation not found');
      }

      const [id] = await db('messages').insert({
        conversation_id: message.conversationId,
        content: message.content,
        sender_type: message.senderType,
        type: message.type || 'text',
        metadata: message.metadata ? JSON.stringify(message.metadata) : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      return id;
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId: number) {
    return db('messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at');
  }
}

export const messageService = new MessageService();