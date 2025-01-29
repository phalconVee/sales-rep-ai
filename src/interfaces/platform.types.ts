export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    variants?: ProductVariant[];
    collections?: string[];
    tags?: string[];
    url: string;
    metadata?: Record<string, any>;
  }
  
  export interface ProductVariant {
    id: string;
    title: string;
    price: number;
    sku: string;
    available: boolean;
    options: Record<string, string>;
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