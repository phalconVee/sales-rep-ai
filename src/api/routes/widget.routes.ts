// src/api/routes/widget.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import * as widgetController from '../controllers/widget.controller';

const router = Router();

router.get('/instructions', asyncHandler(widgetController.getInstallationInstructions));

export default router;