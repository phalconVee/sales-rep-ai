// src/api/routes/webhook.routes.ts
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import * as webhookController from '../controllers/webhook.controller';
import { verifyShopifyWebhook } from '../../middleware/webhook.middleware';
import { verifyWooCommerceWebhook } from '../../middleware/woocommerce-webhook.middleware';
import * as woocommerceController from '../controllers/woocommerce-webhook.controller';

const router = Router();

router.post('/shopify', 
    verifyShopifyWebhook, 
    asyncHandler(webhookController.handleShopifyWebhook)
);

// router.post('/woocommerce',
//     verifyWooCommerceWebhook,
//     asyncHandler(woocommerceController.handleWooCommerceWebhook)
// );

export default router;