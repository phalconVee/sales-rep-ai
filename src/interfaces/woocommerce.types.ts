export interface WooCommerceWebhookPayload {
    id: number;
    action: string;
    status: string;
    resource: string;
    resource_data: Record<string, any>;
    store_id: number;
    created_at: string;
}

export interface WooCommerceHeaders {
    'x-wc-webhook-signature': string;
    'x-wc-webhook-source': string;
    'x-wc-webhook-topic': string;
    'x-wc-webhook-resource': string;
}