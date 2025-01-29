import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import shopifyConfig from '../../config/shopify.config';

// Types and Interfaces
export interface PlatformConfig {
  apiKey: string;
  shopId: string;
  apiUrl: string;
  accessToken: string;
}

export interface ProductQuery {
  collection?: string;
  tag?: string;
  limit?: number;
  page?: number;
  sort?: 'title' | 'created' | 'price' | 'best-selling';
}

export interface CartUpdate {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  variants: ProductVariant[];
  collections?: string[];
  tags: string[];
  url: string;
  metadata: {
    vendor: string;
    type: string;
    handle: string;
  };
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  sku: string;
  available: boolean;
  options: Record<string, string>;
  compareAtPrice?: number;
  inventoryQuantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalPrice: number;
  currency: string;
  checkoutUrl: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  title: string;
}

export interface StoreSettings {
  currency: string;
  language: string;
  name: string;
  supportEmail: string;
  checkoutSettings: {
    redirectToCheckout: boolean;
    customDomain?: string;
  };
}

export class ShopifyPlatform {
  private client!: AxiosInstance;
  private shopId!: number;

  async initialize(shopId: number): Promise<void> {
    try {
        this.shopId = shopId;
        const storeConfig = await db('store_configurations')
            .where('shop_id', shopId)
            .first();

        const credentials = typeof storeConfig.credentials === 'string' 
            ? JSON.parse(storeConfig.credentials)
            : storeConfig.credentials;

        this.client = axios.create({
            baseURL: `https://${credentials.storeName}/admin/api/2024-01`,
            headers: {
                'X-Shopify-Access-Token': credentials.accessToken,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        logger.error('Failed to initialize Shopify platform:', error);
        throw error;
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
        const response = await this.client.get(`/products/${productId}.json`);
        return this.normalizeProduct(response.data.product);
    } catch (error) {
        logger.error(`Failed to fetch Shopify product ${productId}:`, error);
        throw error;
    }
  }

  async getProducts(query?: ProductQuery): Promise<Product[]> {
    try {
      const params = {
        limit: query?.limit || 20,
        page_info: query?.page,
        collection_id: query?.collection,
        sort_by: query?.sort,
      };

      const response = await this.client.get('/products.json', { params });
      return response.data.products.map((product: any) => this.normalizeProduct(product));
    } catch (error) {
      logger.error('Failed to fetch Shopify products:', error);
      throw error;
    }
  }

  async getCart(cartId: string): Promise<Cart> {
    // Note: Shopify doesn't have a direct cart API endpoint
    // We should adjust the behavioral service to not rely on cart data initially
    return {
        id: cartId,
        items: [],
        totalPrice: 0,
        currency: 'USD',
        checkoutUrl: ''
    };
  }

  async updateCart(cartId: string, updates: CartUpdate): Promise<Cart> {
    try {
      const response = await this.client.post(`/cart/${cartId}/update.json`, {
        updates: updates.items.map(item => ({
          id: item.variantId,
          quantity: item.quantity
        }))
      });
      return this.normalizeCart(response.data.cart);
    } catch (error) {
      logger.error(`Failed to update Shopify cart ${cartId}:`, error);
      throw error;
    }
  }

  async createCheckout(cartId: string): Promise<string> {
    try {
      const response = await this.client.post('/checkouts.json', {
        cart_id: cartId
      });
      return response.data.checkout.web_url;
    } catch (error) {
      logger.error(`Failed to create Shopify checkout for cart ${cartId}:`, error);
      throw error;
    }
  }

  async getStoreSettings(): Promise<StoreSettings> {
    try {
        const response = await this.client.get('/shop.json');
        return this.normalizeStoreSettings(response.data.shop);
    } catch (error) {
        // Return default settings on error
        logger.error('Failed to fetch Shopify store settings:', error);
        return {
            currency: 'USD',
            language: 'en',
            name: 'Store',
            supportEmail: '',
            checkoutSettings: {
                redirectToCheckout: true
            }
        };
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await this.client.get('/products/search.json', {
        params: { q: query }
      });
      return response.data.products.map((product: any) => this.normalizeProduct(product));
    } catch (error) {
      logger.error('Failed to search Shopify products:', error);
      throw error;
    }
  }

  private normalizeProduct(shopifyProduct: any): Product {
    return {
      id: shopifyProduct.id.toString(),
      title: shopifyProduct.title,
      description: shopifyProduct.body_html,
      price: parseFloat(shopifyProduct.variants[0].price),
      compareAtPrice: shopifyProduct.variants[0].compare_at_price ? 
        parseFloat(shopifyProduct.variants[0].compare_at_price) : undefined,
      images: shopifyProduct.images.map((img: any) => img.src),
      variants: shopifyProduct.variants.map((variant: any) => this.normalizeVariant(variant)),
      tags: Array.isArray(shopifyProduct.tags) ? shopifyProduct.tags : 
        shopifyProduct.tags?.split(',') || [],
      url: `/products/${shopifyProduct.handle}`,
      metadata: {
        vendor: shopifyProduct.vendor,
        type: shopifyProduct.product_type,
        handle: shopifyProduct.handle
      }
    };
  }

  private normalizeVariant(variant: any): ProductVariant {
    return {
      id: variant.id.toString(),
      title: variant.title,
      price: parseFloat(variant.price),
      sku: variant.sku,
      available: variant.available,
      inventoryQuantity: variant.inventory_quantity,
      compareAtPrice: variant.compare_at_price ? 
        parseFloat(variant.compare_at_price) : undefined,
      options: this.extractVariantOptions(variant)
    };
  }

  private extractVariantOptions(variant: any): Record<string, string> {
    const options: Record<string, string> = {};
    if (variant.option1) options['Option1'] = variant.option1;
    if (variant.option2) options['Option2'] = variant.option2;
    if (variant.option3) options['Option3'] = variant.option3;
    return options;
  }

  private normalizeCart(shopifyCart: any): Cart {
    return {
      id: shopifyCart.token,
      items: shopifyCart.items.map((item: any) => ({
        productId: item.product_id.toString(),
        variantId: item.variant_id.toString(),
        quantity: item.quantity,
        price: parseFloat(item.price),
        title: item.title
      })),
      totalPrice: parseFloat(shopifyCart.total_price),
      currency: shopifyCart.currency,
      checkoutUrl: shopifyCart.checkout_url
    };
  }

  private normalizeStoreSettings(shop: any): StoreSettings {
    return {
      currency: shop.currency,
      language: shop.primary_locale,
      name: shop.name,
      supportEmail: shop.email,
      checkoutSettings: {
        redirectToCheckout: true,
        customDomain: shop.domain
      }
    };
  }
}