export enum ChatEvents {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    MESSAGE = 'message',
    MESSAGE_RESPONSE = 'message_response',
    TYPING = 'typing',
    PRESENCE = 'presence',
    ERROR = 'error'
  }
  
  export enum PresenceStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    AWAY = 'away'
  }
  
  export interface ChatMessage {
    id: string;
    content: string;
    sessionId: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }
  
  export interface TypingEvent {
    sessionId: string;
    isTyping: boolean;
  }
  
  export interface PresenceEvent {
    userId: string;
    status: PresenceStatus;
    lastSeen?: Date;
  }