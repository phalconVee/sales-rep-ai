import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './error.middleware';
import { logger } from '../utils/logger';
import { db } from '../config/database';

interface WebhookData {
    topic: string;
    shop: string;
    data: any;
    platform: 'woocommerce';
    source: string;
}

export async function verifyWooCommerceWebhook(
    req: Request & { webhookData?: WebhookData },
    res: Response,
    next: NextFunction
) {
    try {
        const signature = req.header('x-wc-webhook-signature');
        const source = req.header('x-wc-webhook-source');
        const topic = req.header('x-wc-webhook-topic');

        if (!signature || !source || !topic) {
            throw new AppError(401, 'Missing required WooCommerce webhook headers');
        }

        // Get store configuration
        const storeConfig = await db('store_configurations')
            .where('credentials->store_url', source)
            .first();

        if (!storeConfig) {
            throw new AppError(404, 'Store configuration not found');
        }

        const { webhook_secret } = JSON.parse(storeConfig.credentials);
        
        // Verify signature
        const payload = JSON.stringify(req.body);
        const calculated_signature = crypto
            .createHmac('sha256', webhook_secret)
            .update(payload)
            .digest('base64');

        if (!crypto.timingSafeEqual(
            Buffer.from(calculated_signature),
            Buffer.from(signature)
        )) {
            throw new AppError(401, 'Invalid webhook signature');
        }

        // Add webhook data to request
        req.webhookData = {
            topic,
            shop: source,
            data: req.body,
            platform: 'woocommerce',
            source
        };

        next();
    } catch (error) {
        logger.error('WooCommerce webhook verification error:', error);
        next(error);
    }
}