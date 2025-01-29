// src/ml/behavioral/predictor.ts
import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../../utils/logger';

export class BehavioralPredictor {
  private model: tf.LayersModel;

  constructor() {
    this.model = this.buildModel();
  }

  private buildModel(): tf.LayersModel {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [4] // pageViews, timeOnSite, scrollDepth, clicks
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async predict(features: number[]): Promise<number> {
    const inputTensor = tf.tensor2d([features]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const result = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    return result[0];
  }

  async train(
    features: number[][],
    labels: number[],
    epochs = 50,
    batchSize = 32
  ): Promise<tf.History> {
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    try {
      const history = await this.model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.info(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}`);
          }
        }
      });

      return history;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async save(path: string): Promise<void> {
    await this.model.save(`file://${path}`);
  }

  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }
}