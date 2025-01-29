// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import env from '../config/env.config';

export const chatLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request: Request) => {
    return request.headers['x-forwarded-for']?.toString() || request.ip;
  }
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many webhook requests'
  }
});

export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    status: 'error',
    message: 'Too many analytics requests'
  }
});