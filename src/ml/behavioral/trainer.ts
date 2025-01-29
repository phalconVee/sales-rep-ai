// src/ml/behavioral/trainer.ts
import { BehavioralPredictor } from './predictor';
import { trackingService } from '../../services/analytics/tracking.service';
import { logger } from '../../utils/logger';

interface TrainingData {
  features: number[][];
  labels: number[];
}

export class BehavioralTrainer {
  private predictor: BehavioralPredictor;

  constructor() {
    this.predictor = new BehavioralPredictor();
  }

  private prepareTrainingData(events: any[]): TrainingData {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const session of events) {
      features.push([
        session.pageViews,
        session.timeOnSite,
        session.scrollDepth,
        session.clicks
      ]);

      labels.push(session.converted ? 1 : 0);
    }

    return { features, labels };
  }

  async trainModel(modelPath: string): Promise<void> {
    try {
      // Get historical session data
      const sessions = await this.getHistoricalSessions();
      const { features, labels } = this.prepareTrainingData(sessions);

      logger.info('Starting model training...');
      await this.predictor.train(features, labels);
      
      logger.info('Saving trained model...');
      await this.predictor.save(modelPath);
      
      logger.info('Model training completed successfully');
    } catch (error) {
      logger.error('Error during model training:', error);
      throw error;
    }
  }

  private async getHistoricalSessions(): Promise<any[]> {
    // Implement logic to get historical session data
    return [];
  }

  async evaluateModel(testData: TrainingData): Promise<{accuracy: number; precision: number; recall: number}> {
    const predictions = await Promise.all(
      testData.features.map(feature => this.predictor.predict(feature))
    );

    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i] > 0.5 ? 1 : 0;
      const actual = testData.labels[i];

      if (predicted === 1 && actual === 1) tp++;
      if (predicted === 1 && actual === 0) fp++;
      if (predicted === 0 && actual === 1) fn++;
    }

    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const accuracy = predictions.reduce((acc, pred, i) => 
      acc + (Math.round(pred) === testData.labels[i] ? 1 : 0), 0
    ) / predictions.length;

    return { accuracy, precision, recall };
  }
}