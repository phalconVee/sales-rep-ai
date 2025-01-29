// src/index.ts
import { configureExpress } from './config/express.config';
import env from './config/env.config';
import { logger } from './utils/logger';
import { setupWebSocket } from './config/socket';

// Import routes
import chatRoutes from './api/routes/chat.routes';
import webhookRoutes from './api/routes/webhook.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import oauthRoutes from './api/routes/oauth.routes';
import widgetRoutes from './api/routes/widget.routes';

const app = configureExpress();

// Register API routes
app.use('/', oauthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/oauth', oauthRoutes); 
app.use('/widget', widgetRoutes);

// Health check route
app.get('/health', (req, res) => {
 res.status(200).json({ status: 'ok' });
});

// Initialize WebSocket server
const server = setupWebSocket(app);

// Start server
server.listen(env.PORT, () => {
 logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
 logger.info(`WebSocket server running on path ${env.WS_PATH}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error: Error) => {
 logger.error('Unhandled rejection:', error);
 process.exit(1);
});

export default app;