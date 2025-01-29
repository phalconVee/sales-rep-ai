import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import env from '../config/env.config';
import { AppError } from './error.middleware';

interface WebhookData {
    topic: string;
    shop: string;
    data: any;
}

export async function verifyShopifyWebhook(
    req: Request & { webhookData?: WebhookData }, 
    res: Response, 
    next: NextFunction
) {
    try {
        const hmac = req.header('X-Shopify-Hmac-Sha256');
        const topic = req.header('X-Shopify-Topic');
        const shop = req.header('X-Shopify-Shop-Domain');

        if (!hmac || !topic || !shop) {
            throw new AppError(401, 'Missing required headers');
        }

        const rawBody = req.body;
        const calculatedHmac = crypto
            .createHmac('sha256', env.SHOPIFY_API_SECRET)
            .update(Buffer.from(rawBody))
            .digest('base64');

        if (!crypto.timingSafeEqual(
            Buffer.from(calculatedHmac),
            Buffer.from(hmac)
        )) {
            throw new AppError(401, 'Invalid webhook signature');
        }

        req.webhookData = {
            topic,
            shop,
            data: JSON.parse(rawBody)
        };

        next();
    } catch (error) {
        next(error);
    }
}