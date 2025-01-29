// src/api/routes/chat.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import {
  createSession,
  sendMessage,
  getMessages,
  endSession
} from '../controllers/chat.controller';

const router = Router();

router.post('/sessions', asyncHandler(createSession));
router.get('/conversations/:conversationId/messages', asyncHandler(getMessages));
router.post('/conversations/:conversationId/messages', asyncHandler(sendMessage));
router.post('/conversations/:conversationId/end', asyncHandler(endSession));

export default router;