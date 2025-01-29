import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { ChatEvents } from '../events/types';
import { messageService } from '../../services/chat/message.service';
import { conversationService } from '../../services/chat/conversation.service';
import { openAIService } from '../../services/ai/openai.service';

export function handleChatEvents(io: Server, socket: Socket): void {
  socket.on(ChatEvents.MESSAGE, async (data) => {
    try {
      let conversationId;

      // Check if this is a new conversation
      if (!data.sessionId && data.shopId) {
        // Create new conversation
        conversationId = await conversationService.createConversation({
          shopId: data.shopId,
          visitorId: data.visitorId,
          source: data.source,
          url: data.url,
          metadata: data.metadata
        });

        // Emit the conversation ID back to the client
        socket.emit('conversation_created', { conversationId });
      } else {
        conversationId = parseInt(data.sessionId);
        if (isNaN(conversationId)) {
          throw new Error('Invalid conversation ID');
        }
      }

      // If there's a message content, process it
      if (data.content) {
        // Save user message
        await messageService.createMessage({
          conversationId,
          content: data.content,
          senderType: 'user',
          type: 'text'
        });

        // Get AI response
        const aiResponse = await openAIService.generateResponse([
          { content: data.content, role: 'user' }
        ]);

        if (!aiResponse.content) {
          throw new Error('Failed to generate AI response');
        }

        // Save AI response
        const responseId = await messageService.createMessage({
          conversationId,
          content: aiResponse.content,
          senderType: 'assistant',
          type: 'text'
        });

        // Emit AI response back to client
        socket.emit(ChatEvents.MESSAGE_RESPONSE, {
          conversationId,
          messageId: responseId,
          content: aiResponse.content
        });

        // Update last message timestamp
        await conversationService.updateLastMessage(conversationId);
      }

    } catch (error) {
      logger.error('Error processing chat message:', error);
      socket.emit(ChatEvents.ERROR, { 
        message: 'Failed to process message',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  socket.on(ChatEvents.TYPING, (data) => {
    socket.broadcast.emit(ChatEvents.TYPING, {
      sessionId: data.sessionId,
      isTyping: data.isTyping
    });
  });
}