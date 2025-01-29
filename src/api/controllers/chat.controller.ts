// src/api/controllers/chat.controller.ts
import { Request, Response, NextFunction } from 'express';
import { conversationService } from '../../services/chat/conversation.service';
import { messageService } from '../../services/chat/message.service';
import { openAIService } from '../../services/ai/openai.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export async function createSession(req: Request, res: Response) {
  try {
    const { shopId, visitorId, source, url, metadata } = req.body;
    
    // Ensure shopId is a number
    const numericShopId = typeof shopId === 'string' ? parseInt(shopId) : shopId;
    
    const conversationId = await conversationService.createConversation({
      shopId: numericShopId,
      visitorId,
      source,
      url,
      metadata
    });
    
    res.status(201).json({ conversationId });
  } catch (error) {
    console.error('Error creating session:', error);
  }
}

export async function sendMessage(req: Request, res: Response) {
  const { conversationId } = req.params;
  const { content } = req.body;

  try {
    // Validate conversationId
    const convId = parseInt(conversationId);
    if (isNaN(convId)) {
      throw new AppError(400, 'Invalid conversation ID format');
    }

    // Create user message
    const messageId = await messageService.createMessage({
      conversationId: convId,
      content,
      senderType: 'user',
      type: 'text'
    });

    // Update last message timestamp
    await conversationService.updateLastMessage(convId);

    // Generate AI response
    const aiResponse = await openAIService.generateResponse([{ content, role: 'user' }]);
    
    if (!aiResponse.content) {
      throw new AppError(500, 'Failed to generate AI response');
    }

    // Save AI response
    const responseId = await messageService.createMessage({
      conversationId: convId,
      content: aiResponse.content,
      senderType: 'assistant',
      type: 'text'
    });

    res.json({
      success: true,
      data: {
        messageId,
        responseId
      }
    });
  } catch (error) {
    logger.error('Error in sendMessage:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to process message');
  }
}

export async function getMessages(req: Request, res: Response) {
  const { conversationId } = req.params;
  const messages = await messageService.getConversationMessages(parseInt(conversationId, 10));
  res.json(messages);
}

export async function endSession(req: Request, res: Response) {
  const { conversationId } = req.params;
  await conversationService.endConversation(parseInt(conversationId, 10));
  res.status(204).send();
}