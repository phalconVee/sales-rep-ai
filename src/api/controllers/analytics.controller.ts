import { Request, Response } from 'express';
import { trackingService } from '../../services/analytics/tracking.service';
import { insightsService } from '../../services/analytics/insights.service';
import { behavioralEventSchema } from '../../utils/validators';
import { AppError } from '../../middleware/error.middleware';

export async function trackEvent(req: Request, res: Response) {
  const { userId, sessionId, eventType, data } = behavioralEventSchema.parse(req.body);
  
  const event = trackingService.trackEvent(
    userId,
    sessionId,
    eventType,
    data
  );
  
  res.status(201).json(event);
}

export async function getInsights(req: Request, res: Response) {
  const startTime = req.query.startTime as string;
  const endTime = req.query.endTime as string;

  if (!startTime || !endTime) {
    throw new AppError(400, 'Start time and end time are required');
  }

  const report = await insightsService.generateInsightsReport(
    new Date(startTime),
    new Date(endTime)
  );
  
  res.json(report);
}

export async function getConversionMetrics(req: Request, res: Response) {
  const startTime = req.query.startTime as string;
  const endTime = req.query.endTime as string;

  if (!startTime || !endTime) {
    throw new AppError(400, 'Start time and end time are required');
  }

  const metrics = await insightsService.getConversionMetrics(
    new Date(startTime),
    new Date(endTime)
  );
  
  res.json(metrics);
}

export async function getEngagementMetrics(req: Request, res: Response) {
  const startTime = req.query.startTime as string;
  const endTime = req.query.endTime as string;

  if (!startTime || !endTime) {
    throw new AppError(400, 'Start time and end time are required');
  }

  const metrics = await insightsService.getEngagementMetrics(
    new Date(startTime),
    new Date(endTime)
  );
  
  res.json(metrics);
}