// src/ml/embeddings/generator.ts
import { openAIService } from '../../services/ai/openai.service';
import { vectorStoreService } from '../../services/ai/vectorstore.service';
import { logger } from '../../utils/logger';

export class EmbeddingsGenerator {
  async generateProductEmbeddings(product: {
    id: string;
    title: string;
    description: string;
    price: number;
    categories?: string[];
  }): Promise<void> {
    try {
      const content = this.formatProductContent(product);
      await vectorStoreService.upsertVector(
        `product_${product.id}`,
        content,
        {
          type: 'product',
          id: product.id,
          title: product.title,
          price: product.price,
          categories: product.categories
        }
      );
    } catch (error) {
      logger.error(`Error generating embeddings for product ${product.id}:`, error);
      throw error;
    }
  }

  async generateBulkProductEmbeddings(products: any[]): Promise<void> {
    const batchSize = 50;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Promise.all(
        batch.map(product => this.generateProductEmbeddings(product))
      );
      logger.info(`Processed ${i + batch.length}/${products.length} products`);
    }
  }

  private formatProductContent(product: any): string {
    const parts = [
      `Title: ${product.title}`,
      `Description: ${product.description}`,
      `Price: ${product.price}`,
    ];

    if (product.categories?.length) {
      parts.push(`Categories: ${product.categories.join(', ')}`);
    }

    return parts.join('\n');
  }

  async findSimilarProducts(query: string, limit = 5): Promise<any[]> {
    const results = await vectorStoreService.queryVectors(query, limit);
    return results.map(result => ({
      id: result.metadata.id,
      title: result.metadata.title,
      price: result.metadata.price,
      score: result.score
    }));
  }
}

export const embeddingsGenerator = new EmbeddingsGenerator();