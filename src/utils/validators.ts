import { z } from 'zod';

export const behavioralEventSchema = z.object({
  eventType: z.enum(['pageView', 'click', 'scroll', 'exit']),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),  // Added sessionId
  timestamp: z.date().optional().default(() => new Date()),
  data: z.record(z.unknown())  // Added data field
});

// Rest of the validators remain the same...
export const chatMessageSchema = z.object({
  message: z.string().min(1),
  userId: z.string().uuid(),
  timestamp: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const websiteConfigSchema = z.object({
  domain: z.string().url(),
  widgetPosition: z.enum(['left', 'right']),
  theme: z.object({
    primaryColor: z.string(),
    textColor: z.string(),
  }),
  triggers: z.array(z.object({
    condition: z.string(),
    action: z.string(),
  })),
});