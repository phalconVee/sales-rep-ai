// src/config/socket.ts
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { Express } from 'express';
import env from './env.config';
import { logger } from '../utils/logger';
import { handleChatEvents } from '../websocket/handlers/chat.handler';
import { handlePresenceEvents } from '../websocket/handlers/presence.handler';

export function setupWebSocket(app: Express): HttpServer {
  const server = new HttpServer(app);
  const io = new Server(server, {
    path: env.WS_PATH,
    cors: {
      origin: [
        '*',
        'http://localhost:4000',
        'http://127.0.0.1:4000',
        // Add other allowed origins as needed
      ],
      methods: ['GET', 'POST'],
      allowedHeaders: [
        'Authorization',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers'
      ],
      credentials: true,
      exposedHeaders: ['Access-Control-Allow-Origin']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const { apiKey, shopId, platform } = socket.handshake.auth;
    
    logger.info('Socket middleware authentication attempt', {
        hasApiKey: !!apiKey,
        shopId,
        platform
    });

    if (!apiKey || !shopId || !platform) {
        logger.error('Missing required auth data', {
            hasApiKey: !!apiKey,
            hasShopId: !!shopId,
            hasPlatform: !!platform
        });
        return next(new Error('Authentication error - Missing required data'));
    }

    next();
  });

  // Handle connection
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Set up event handlers
    handleChatEvents(io, socket);
    handlePresenceEvents(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  return server;
}