import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import * as oauthController from '../controllers/oauth.controller';

const router = Router();

router.get('/', asyncHandler(oauthController.handleShopifyInit));
router.get('/shopify/install', asyncHandler(oauthController.installShopify));
router.get('/shopify/callback', asyncHandler(oauthController.shopifyCallback));

export default router;