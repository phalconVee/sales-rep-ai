export interface Visitor {
    id: string;
    sessionId: string;
    firstSeen: Date;
    lastSeen: Date;
    device: {
      type: string;
      userAgent: string;
    };
    behavior: {
      pageViews: number;
      interactions: number;
      averageTimeOnSite: number;
    };
  }
  
  export interface VisitorSession {
    id: string;
    visitorId: string;
    startTime: Date;
    endTime?: Date;
    pages: PageView[];
    events: UserEvent[];
  }
  
  export interface PageView {
    path: string;
    timestamp: Date;
    duration: number;
    scrollDepth: number;
  }
  
  export interface UserEvent {
    type: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }