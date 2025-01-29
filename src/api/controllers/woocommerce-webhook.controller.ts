// src/api/controllers/woocommerce-webhook.controller.ts
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import redis from '../../config/redis.config';
import { AppError } from '../../middleware/error.middleware';

interface WebhookRequest extends Request {
    webhookData: {
        topic: string;
        shop: string;
        data: Record<string, any>;
        platform: 'woocommerce';
        source: string;
    };
}

export async function handleWooCommerceWebhook(req: WebhookRequest, res: Response) {
    try {
        const { topic, shop, data } = req.webhookData;

        logger.info(`Received WooCommerce webhook: ${topic} from ${shop}`);

        const storeConfig = await db('store_configurations')
            .where('credentials->store_url', shop)
            .first();

        if (!storeConfig) {
            throw new AppError(404, 'Store configuration not found');
        }

        switch (topic) {
            case 'product.created':
            case 'product.updated':
                await handleProductWebhook(storeConfig.shop_id, data);
                break;

            case 'order.created':
            case 'order.updated':
                await handleOrderWebhook(storeConfig.shop_id, data);
                break;

            case 'customer.created':
            case 'customer.updated':
                await handleCustomerWebhook(storeConfig.shop_id, data);
                break;

            default:
                logger.info(`Unhandled WooCommerce webhook topic: ${topic}`);
        }

        res.status(200).send();
    } catch (error) {
        logger.error('WooCommerce webhook handling error:', error);
        res.status(200).send();
    }
}

async function handleProductWebhook(shopId: number, data: Record<string, any>) {
    try {
        const productKey = `shop:${shopId}:wc:product:${data.id}`;
        await redis.setex(
            productKey,
            60 * 60 * 24,
            JSON.stringify({
                id: data.id,
                name: data.name,
                price: data.price,
                description: data.description,
                status: data.status,
                updated_at: new Date().toISOString()
            })
        );

        await db('product_updates').insert({
            shop_id: shopId,
            product_id: data.id.toString(),
            data: JSON.stringify(data),
            created_at: new Date()
        });

        logger.info(`WooCommerce product ${data.id} updated for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling WooCommerce product webhook:', error);
    }
}

async function handleOrderWebhook(shopId: number, data: Record<string, any>) {
    try {
        await db('order_events').insert({
            shop_id: shopId,
            order_id: data.id.toString(),
            customer_id: data.customer_id?.toString(),
            data: JSON.stringify(data),
            created_at: new Date()
        });

        if (data.customer_id) {
            await updateWooCommerceCustomerMetrics(shopId, data.customer_id.toString());
        }

        logger.info(`WooCommerce order ${data.id} processed for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling WooCommerce order webhook:', error);
    }
}

async function handleCustomerWebhook(shopId: number, data: Record<string, any>) {
    try {
        const customerKey = `shop:${shopId}:wc:customer:${data.id}`;
        await redis.setex(
            customerKey,
            60 * 60 * 24,
            JSON.stringify({
                id: data.id,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                updated_at: new Date().toISOString()
            })
        );

        logger.info(`WooCommerce customer ${data.id} updated for shop ${shopId}`);
    } catch (error) {
        logger.error('Error handling WooCommerce customer webhook:', error);
    }
}

async function updateWooCommerceCustomerMetrics(shopId: number, customerId: string) {
    try {
        const orders = await db('order_events')
            .where({
                shop_id: shopId,
                customer_id: customerId
            })
            .orderBy('created_at', 'desc');

        const metrics = {
            total_orders: orders.length,
            total_spent: orders.reduce((sum, order) => {
                const orderData = JSON.parse(order.data);
                return sum + parseFloat(orderData.total);
            }, 0),
            last_order_date: orders[0]?.created_at,
            platform: 'woocommerce'
        };

        const metricsKey = `shop:${shopId}:wc:customer:${customerId}:metrics`;
        await redis.setex(
            metricsKey,
            60 * 60 * 24,
            JSON.stringify(metrics)
        );
    } catch (error) {
        logger.error('Error updating WooCommerce customer metrics:', error);
    }
}