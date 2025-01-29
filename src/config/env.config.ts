import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // OpenAI
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string(),

  // WebSocket
  WS_PORT: z.string().transform(Number).default('3001'),
  WS_PATH: z.string().default('/socket.io'),

  // Security
  JWT_SECRET: z.string(),
  CORS_ORIGIN: z.string(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('15'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // TensorFlow.js
  TFJS_BACKEND: z.string().default('tensorflow'),
  MODEL_PATH: z.string(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['dev', 'combined']).default('dev'),

  // Redis
  REDIS_URL: z.string().url(),

  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_PORT: z.string().transform(Number).default('3306'),

  // Shopify Credentials (for OAuth)
  SHOPIFY_API_KEY: z.string(),
  SHOPIFY_API_SECRET: z.string(),

  // Redis Configuration
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.string().transform(Number).default('6379'),

  // App
  APP_URL: z.string().url(), 
});

const env = envSchema.parse(process.env);

export default env;