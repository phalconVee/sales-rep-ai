declare namespace Express {
    interface Request {
        webhookData?: {
            topic: string;
            shop: string;
            data: any;
            platform?: 'shopify' | 'woocommerce' | 'bigcommerce';
            source?: string;
        };
    }
}