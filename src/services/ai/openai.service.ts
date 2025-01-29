import OpenAI from 'openai';
import env from '../../config/env.config';
import { logger } from '../../utils/logger';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  }

  async generateResponse(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        temperature: 0.7,
      });

      return completion.choices[0].message;
    } catch (error) {
      logger.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Embedding Generation Error:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();