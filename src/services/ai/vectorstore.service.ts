// src/services/ai/vectorstore.service.ts
import { PineconeClient } from '@pinecone-database/pinecone';
import env from '../../config/env.config';
import { logger } from '../../utils/logger';
import { openAIService } from './openai.service';

export class VectorStoreService {
  private client: PineconeClient;
  private initialized = false;

  constructor() {
    this.client = new PineconeClient();
  }

  async initialize() {
    if (!this.initialized) {
      await this.client.init({
        apiKey: env.PINECONE_API_KEY,
        environment: env.PINECONE_ENVIRONMENT,
      });
      this.initialized = true;
    }
  }

  async upsertVector(
    id: string,
    text: string,
    metadata: Record<string, unknown> = {}
  ) {
    await this.initialize();
    const embedding = await openAIService.generateEmbedding(text);
    
    const index = this.client.Index(env.PINECONE_INDEX);
    await index.upsert({
      upsertRequest: {
        vectors: [{
          id,
          values: embedding,
          metadata
        }]
      }
    });
  }

  async queryVectors(text: string, topK = 5) {
    await this.initialize();
    const queryEmbedding = await openAIService.generateEmbedding(text);
    
    const index = this.client.Index(env.PINECONE_INDEX);
    const queryResponse = await index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      }
    });

    return queryResponse.matches || [];
  }
}

export const vectorStoreService = new VectorStoreService();