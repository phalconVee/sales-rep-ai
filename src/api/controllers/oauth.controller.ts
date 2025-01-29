import { Request, Response } from 'express';
import { db } from '../../config/database';
import redis from '../../config/redis.config';
import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import env from '../../config/env.config';
import { ApiError } from '../../interfaces/error.types';

const SHOPIFY_SCOPES = [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers'
];

const STATE_EXPIRY = 60 * 15; // 15 minutes in seconds

export async function handleShopifyInit(req: Request, res: Response) {
    try {
        const { shop, hmac, host, timestamp } = req.query;

        // Validate the shop parameter
        if (!shop || typeof shop !== 'string' || !shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
            throw new Error('Invalid shop parameter');
        }

        // Redirect to the install route with the shop parameter
        res.redirect(`/oauth/shopify/install?shop=${shop}`);
    } catch (error) {
        logger.error('Shopify init error:', error);
        res.status(500).json({ error: 'Installation failed' });
    }
}

export async function installShopify(req: Request, res: Response) {
    try {
        const shop = req.query.shop as string;
        if (!shop || !shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
            throw new Error('Invalid shop parameter');
        }

        // Generate state and store in Redis
        const state = crypto.randomBytes(16).toString('hex');
        
        // Store state and shop in Redis with expiry
        await redis.setex(
            `shopify_oauth_state:${state}`,
            STATE_EXPIRY,
            JSON.stringify({ shop, timestamp: Date.now() })
        );

        // Construct the authorization URL
        const redirectUri = `${env.APP_URL}/oauth/shopify/callback`;
        const installUrl = `https://${shop}/admin/oauth/authorize?` +
            `client_id=${env.SHOPIFY_API_KEY}` +
            `&scope=${SHOPIFY_SCOPES.join(',')}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&state=${state}`;

        res.redirect(installUrl);
    } catch (error) {
        const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error('Shopify installation error:', {
            message: apiError.message,
            stack: apiError.stack
        });
        
        res.status(500).json({ 
            error: 'Installation failed', 
            details: apiError.message 
        });
    }
}

export async function shopifyCallback(req: Request, res: Response) {
    try {
        const { shop, code, state } = req.query;

        // Validate required parameters
        if (!shop || !code || !state) {
            throw new Error('Missing required parameters');
        }

        // Verify state from Redis
        const stateKey = `shopify_oauth_state:${state}`;
        const storedState = await redis.get(stateKey);
        
        if (!storedState) {
            throw new Error('Invalid or expired state');
        }

        const { shop: storedShop } = JSON.parse(storedState);
        if (shop !== storedShop) {
            throw new Error('Shop mismatch');
        }

        // Clean up Redis state
        await redis.del(stateKey);

        // First, check if store is already installed
        const existingConfig = await db('store_configurations')
        .whereRaw('JSON_UNQUOTE(JSON_EXTRACT(credentials, "$.storeName")) = ?', [shop])
        .first();

        if (existingConfig) {
            // Store is already installed, show installation instructions
            return res.redirect(`/widget/instructions?shop=${shop}`);
        }

        // If not installed, proceed with installation process
        // Exchange code for access token
        const accessTokenResponse = await axios.post(
            `https://${shop}/admin/oauth/access_token`,
            {
                client_id: env.SHOPIFY_API_KEY,
                client_secret: env.SHOPIFY_API_SECRET,
                code
            }
        );

        const { access_token } = accessTokenResponse.data;

        // Get shop details including email
        const shopDetails = await axios.get(
            `https://${shop}/admin/api/2024-01/shop.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': access_token
                }
            }
        );

        const merchantEmail = shopDetails.data.shop.email;

        // Check if merchant exists in customers table
        const customer = await db('customers')
            .where('email', merchantEmail)
            .first();

        if (!customer) {
            // Store hasn't signed up on our platform
            return res.status(400).json({
                error: 'Not registered',
                message: 'Please sign up on our business platform first',
            });
        }

        const shopId = await createOrGetShopId(shop as string, {
            customerId: customer.id,
            accessToken: access_token
        });

        // Generate API key for the store
        const apiKey = `whrf_pk_${crypto.randomBytes(16).toString('hex')}`;

        // Store configuration
        await db('store_configurations').insert({
            shop_id: shopId,
            platform: 'shopify',
            credentials: JSON.stringify({
                accessToken: access_token,
                storeName: shop,
                installationDate: new Date().toISOString()
            }),
            settings: JSON.stringify({
                apiVersion: '2024-01',
                scopes: SHOPIFY_SCOPES,
                webhookEndpoints: []
            }),
            api_key: apiKey,
            created_at: new Date(),
            updated_at: new Date()
        });

        // Cache the shop configuration in Redis for quick access
        await redis.setex(
            `shop_config:${shopId}`,
            60 * 60 * 24, // 24 hours
            JSON.stringify({
                apiKey,
                platform: 'shopify',
                shop
            })
        );

        res.status(200).json({
            success: true,
            message: 'Installation successful',
            shopId
        });

    } catch (error) {
        let apiError: ApiError;

        if (error instanceof AxiosError) {
            apiError = new Error(error.response?.data?.error || error.message);
            apiError.statusCode = error.response?.status || 500;
        } else if (error instanceof Error) {
            apiError = error;
            apiError.statusCode = 500;
        } else {
            apiError = new Error('Unknown error occurred');
            apiError.statusCode = 500;
        }

        logger.error('Shopify callback error:', {
            message: apiError.message,
            statusCode: apiError.statusCode,
            stack: apiError.stack
        });

        res.status(apiError.statusCode || 500).json({ 
            error: 'Installation failed', 
            details: apiError.message 
        });
    }
}

async function createOrGetShopId(shopName: string, data: {
    customerId: number;
    accessToken: string;
}): Promise<number> {
    try {
        // Check if shop exists
        const existingShop = await db('shops')
            .where('shop_domain', shopName)
            .first();

        if (existingShop) {
            // Update existing shop
            await db('shops')
                .where('id', existingShop.id)
                .update({
                    access_token: data.accessToken,
                    updated_at: new Date()
                });
            return existingShop.id;
        }

        // Create new shop
        const [shopId] = await db('shops').insert({
            customer_id: data.customerId,
            platform: 'shopify',
            shop_domain: shopName,
            name: shopName.split('.')[0],
            access_token: data.accessToken,
            is_enabled: true,
            created_at: new Date(),
            updated_at: new Date(),
            settings: JSON.stringify({
                installed_at: new Date(),
                platform_version: '2024-01'
            })
        });

        return shopId;
    } catch (error) {
        const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error('Error in createOrGetShopId:', {
            message: apiError.message,
            stack: apiError.stack
        });
        throw new Error('Failed to create or get shop ID');
    }
}

export function verifyShopifyWebhook(
    data: string | Buffer,
    hmac: string,
    secret: string
): boolean {
    // Convert data to Buffer if it's a string
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    const calculated_hmac = crypto
        .createHmac('sha256', secret)
        .update(dataBuffer)
        .digest('base64');

    return crypto.timingSafeEqual(
        Buffer.from(calculated_hmac),
        Buffer.from(hmac)
    );
}