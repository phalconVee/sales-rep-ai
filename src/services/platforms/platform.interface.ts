import { Product, Cart, StoreSettings } from '../../interfaces/platform.types';

export interface EcommercePlatform {
  initialize(config: PlatformConfig): Promise<void>;
  getProduct(productId: string): Promise<Product>;
  getProducts(query?: ProductQuery): Promise<Product[]>;
  getCart(visitorId: string): Promise<Cart>;
  updateCart(cartId: string, updates: CartUpdate): Promise<Cart>;
  createCheckout(cartId: string): Promise<string>; // Returns checkout URL
  getStoreSettings(): Promise<StoreSettings>;
  searchProducts(query: string): Promise<Product[]>;
}

export interface PlatformConfig {
  apiKey: string;
  shopId: string;
  apiUrl: string;
  accessToken?: string;
}

export interface ProductQuery {
  collection?: string;
  tag?: string;
  limit?: number;
  page?: number;
  sort?: string;
}

export interface CartUpdate {
  items: {
    productId: string;
    variantId: string;
    quantity: number;
  }[];
}