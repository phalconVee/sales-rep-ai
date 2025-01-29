// src/api/routes/analytics.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.post('/events', asyncHandler(analyticsController.trackEvent));
router.get('/insights', asyncHandler(analyticsController.getInsights));
router.get('/metrics/conversion', asyncHandler(analyticsController.getConversionMetrics));
router.get('/metrics/engagement', asyncHandler(analyticsController.getEngagementMetrics));

export default router;