// src/config/express.config.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import env from './env.config';
import { errorHandler } from '../middleware/error.middleware';

export function configureExpress(): Express {
  const app = express();

  app.set('trust proxy', 1);  // Trust first proxy
  
  // Update CORS configuration
  app.use(cors({
    origin: [
      '*',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      // Add other allowed origins as needed
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers'
    ],
    credentials: true,
    exposedHeaders: ['Access-Control-Allow-Origin']
  }));

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: env.RATE_LIMIT_MAX_REQUESTS
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(morgan(env.LOG_FORMAT));

  // Error handling
  app.use(errorHandler);

  return app;
}