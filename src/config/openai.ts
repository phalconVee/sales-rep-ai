// src/config/openai.ts
import OpenAI from 'openai';
import env from './env.config';
import { logger } from '../utils/logger';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }
  return openaiClient;
}

export const defaultModelConfig = {
  model: env.OPENAI_MODEL,
  temperature: 0.7,
  max_tokens: 150,
  presence_penalty: 0.6,
  frequency_penalty: 0.5,
};

export const embeddingConfig = {
  model: 'text-embedding-ada-002',
  dimensions: 1536
};