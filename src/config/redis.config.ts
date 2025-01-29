// src/config/redis.config.ts
import Redis from 'ioredis';
import env from './env.config';
import { logger } from '../utils/logger';

const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    // password: env.REDIS_PASSWORD,
    retryStrategy: (times: number): number | null => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('error', (error: Error) => {
    logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

export default redis;