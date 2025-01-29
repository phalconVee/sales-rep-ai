// src/api/controllers/webhook.controller.ts
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import redis from '../../config/redis.config';

export async function handleShopifyWebhook(req: Request, res: Response) {
    try {
        const hmac = req.header('X-Shopify-Hmac-Sha256');
        const topic = req.header('X-Shopify-Topic');
        const shop = req.header('X-Shopify-Shop-Domain');

        if (!hmac || !topic || !shop) {
            throw new AppError(401, 'Missing required headers');
        }

        // Get store configuration
        const storeConfig = await db('store_configurations')
            .where('credentials->storeName', shop)
            .first();

        if (!storeConfig) {
            throw new AppError(404, 'Store configuration not found');
        }

        // Process webhook based on topic
        switch (topic) {
            case 'products/create':
            case 'products/update':
                await handleProductWebhook(storeConfig.shop_id, req.body);
                break;

            case 'orders/create':
                await handleOrderWebhook(storeConfig.shop_id, req.body);
                break;

            case 'customers/create':
            case 'customers/update':
                await handleCustomerWebhook(storeConfig.shop_id, req.body);
                break;

            default:
                logger.info(`Unhandled webhook topic: ${topic}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).send();
    } catch (error) {
        logger.error('Webhook handling error:', error);
        // Still return 200 to prevent retries
        res.status(200).send();
    }
}

async function handleProductWebhook(shopId: number, data: Record<string, any>) {
    try {
        // Store product data in Redis for quick access
        const productKey = `shop:${shopId}:product:${data.id}`;
        await redis.setex(
            productKey,
            60 * 60 * 24, // 24 hours
            JSON.stringify({
                id: data.id,
                title: data.title,
                price: data.variants[0]?.price,
                description: data.body_html,
                updated_at: new Date().toISOString()
            })
        );

        // Log product update
        await db('product_updates').insert({
            shop_id: shopId,
            product_id: data.id,
            data: JSON.stringify(data),
            created_at: new Date()
        });

        logger.info(`Product ${data.id} updated for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling product webhook:', error);
    }
}

async function handleOrderWebhook(shopId: number, data: Record<string, any>) {
    try {
        // Store order data
        await db('order_events').insert({
            shop_id: shopId,
            order_id: data.id,
            customer_id: data.customer?.id,
            data: JSON.stringify(data),
            created_at: new Date()
        });

        // Update customer metrics if customer exists
        if (data.customer?.id) {
            await updateCustomerMetrics(shopId, data.customer.id);
        }

        logger.info(`Order ${data.id} processed for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling order webhook:', error);
    }
}

async function handleCustomerWebhook(shopId: number, data: Record<string, any>) {
    try {
        // Store customer data in Redis
        const customerKey = `shop:${shopId}:customer:${data.id}`;
        await redis.setex(
            customerKey,
            60 * 60 * 24, // 24 hours
            JSON.stringify({
                id: data.id,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                updated_at: new Date().toISOString()
            })
        );

        logger.info(`Customer ${data.id} updated for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling customer webhook:', error);
    }
}

async function updateCustomerMetrics(shopId: number, customerId: string) {
    try {
        // Get customer's orders
        const orders = await db('order_events')
            .where({
                shop_id: shopId,
                customer_id: customerId
            })
            .orderBy('created_at', 'desc');

        // Calculate metrics
        const metrics = {
            total_orders: orders.length,
            total_spent: orders.reduce((sum, order) => sum + parseFloat(order.data.total_price), 0),
            last_order_date: orders[0]?.created_at,
        };

        // Store metrics in Redis
        const metricsKey = `shop:${shopId}:customer:${customerId}:metrics`;
        await redis.setex(
            metricsKey,
            60 * 60 * 24, // 24 hours
            JSON.stringify(metrics)
        );
    } catch (error) {
        logger.error('Error updating customer metrics:', error);
    }
}