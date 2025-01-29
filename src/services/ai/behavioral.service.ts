// src/services/ai/behavioral.service.ts
import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../../utils/logger';

export class BehavioralService {
  private model: tf.LayersModel | null = null;

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel('file://./models/behavioral/model.json');
      logger.info('Behavioral model loaded successfully');
    } catch (error) {
      logger.error('Error loading behavioral model:', error);
      throw error;
    }
  }

  async predictEngagement(userBehavior: Record<string, number>) {
    if (!this.model) {
      await this.loadModel();
    }

    const inputTensor = tf.tensor2d([Object.values(userBehavior)]);
    const prediction = this.model!.predict(inputTensor) as tf.Tensor;
    
    // Get the raw data from tensor
    const predictionData = await prediction.data();
    
    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();

    // Return first prediction value
    return predictionData[0];
  }

  async shouldTriggerInteraction(userId: string, behaviorMetrics: Record<string, number>) {
    const engagementScore = await this.predictEngagement(behaviorMetrics);
    return engagementScore < 0.5;
  }
}

export const behavioralService = new BehavioralService();