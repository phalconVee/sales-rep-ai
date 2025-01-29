import { db } from './database';

interface StoreConfiguration {
    platform: 'shopify' | 'bigcommerce' | 'woocommerce';
    credentials: {
        apiKey: string;
        accessToken: string;
        storeName: string;
    };
}

class StoreConfigManager {
    // Get a store's configuration from database
    static async getStoreConfig(shopId: number): Promise<StoreConfiguration> {
        const config = await db('store_configurations')
            .where('shop_id', shopId)
            .first();
            
        return config;
    }
}