import { behavioralService } from '../ai/behavioral.service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  lastActive: Date;
  metadata: {
    userAgent?: string;
    referrer?: string;
    pagePath?: string;
    [key: string]: unknown;
  };
}

export class SessionService {
  private sessions: Map<string, ChatSession> = new Map();

  createSession(userId: string, metadata: Record<string, unknown> = {}): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      userId,
      startTime: new Date(),
      lastActive: new Date(),
      metadata
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  async shouldInitiateChat(sessionId: string, behaviorMetrics: Record<string, number>): Promise<boolean> {
    const session = this.getSession(sessionId);
    if (!session) return false;

    return behavioralService.shouldTriggerInteraction(session.userId, behaviorMetrics);
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  cleanInactiveSessions(maxInactiveTime: number = 30 * 60 * 1000): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActive.getTime() > maxInactiveTime) {
        this.endSession(sessionId);
      }
    }
  }
}

export const sessionService = new SessionService();