export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    sessionId: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }
  
  // src/models/chat/session.model.ts
  export interface ChatSession {
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