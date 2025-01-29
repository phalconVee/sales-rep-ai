export interface WebhookPayload {
    type: string;
    payload: any;
    shopId: number;
    platform: 'shopify' | 'bigcommerce' | 'woocommerce';
}

export interface ShopifyWebhookPayload {
    topic: string;
    shop_domain: string;
    data: any;
}