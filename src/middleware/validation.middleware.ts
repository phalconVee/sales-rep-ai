import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './error.middleware';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'Validation failed', { errors: error.errors }));
      } else {
        next(error);
      }
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  pagination: z.object({
    query: z.object({
      page: z.string().optional().transform(Number).default('1'),
      limit: z.string().optional().transform(Number).default('10')
    })
  }),

  dateRange: z.object({
    query: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  }),

  uuid: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),

  chatMessage: z.object({
    body: z.object({
      content: z.string().min(1).max(1000),
      sessionId: z.string().uuid(),
      metadata: z.record(z.unknown()).optional()
    })
  })
};

// Request body validation schemas
export const requestSchemas = {
  createSession: z.object({
    body: z.object({
      userId: z.string().uuid(),
      metadata: z.record(z.unknown()).optional()
    })
  }),

  trackEvent: z.object({
    body: z.object({
      userId: z.string().uuid(),
      eventType: z.string(),
      data: z.record(z.unknown()),
      timestamp: z.string().datetime().optional()
    })
  }),

  updateConfig: z.object({
    body: z.object({
      widgetPosition: z.enum(['left', 'right']),
      theme: z.object({
        primaryColor: z.string(),
        textColor: z.string()
      }),
      triggers: z.array(z.object({
        condition: z.string(),
        action: z.string()
      }))
    })
  })
};