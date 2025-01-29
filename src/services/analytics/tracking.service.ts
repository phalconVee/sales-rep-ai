// src/services/analytics/tracking.service.ts
import { logger } from '../../utils/logger';

interface TrackingEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export class TrackingService {
  private events: TrackingEvent[] = [];

  trackEvent(
    userId: string,
    sessionId: string,
    eventType: string,
    data: Record<string, unknown>
  ): TrackingEvent {
    const event: TrackingEvent = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      eventType,
      timestamp: new Date(),
      data
    };

    this.events.push(event);
    return event;
  }

  getUserEvents(userId: string | 'all', startTime?: Date, endTime?: Date): TrackingEvent[] {
    return this.events.filter(event => 
      (userId === 'all' || event.userId === userId) &&
      (!startTime || event.timestamp >= startTime) &&
      (!endTime || event.timestamp <= endTime)
    );
  }

  getSessionEvents(sessionId: string): TrackingEvent[] {
    return this.events.filter(event => event.sessionId === sessionId);
  }

  getBehaviorMetrics(userId: string, timeWindow: number = 5 * 60 * 1000): Record<string, number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);
    const recentEvents = this.getUserEvents(userId, startTime, endTime);

    return {
      pageViews: recentEvents.filter(e => e.eventType === 'pageView').length,
      clicks: recentEvents.filter(e => e.eventType === 'click').length,
      scrollDepth: Math.max(...recentEvents
        .filter(e => e.eventType === 'scroll')
        .map(e => (e.data.depth as number) || 0), 0),
      timeOnSite: timeWindow / 1000
    };
  }
}

export const trackingService = new TrackingService();