import winston from 'winston';
import env from '../config/env.config';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});