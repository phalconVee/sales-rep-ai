// src/services/platforms/platform.factory.ts
import { EcommercePlatform, PlatformConfig } from './platform.interface';
import { ShopifyPlatform } from './shopify.platform';
// import { BigCommercePlatform } from './bigcommerce.platform';
// import { WooCommercePlatform } from './woocommerce.platform';

export class PlatformFactory {
  static async createPlatform(
    type: 'shopify' | 'bigcommerce' | 'woocommerce',
    config: PlatformConfig
  ): Promise<EcommercePlatform> {
    let platform: EcommercePlatform;

    switch (type) {
      case 'shopify':
        platform = new ShopifyPlatform();
        break;
    //   case 'bigcommerce':
    //     platform = new BigCommercePlatform();
    //     break;
    //   case 'woocommerce':
    //     platform = new WooCommercePlatform();
    //     break;
      default:
        throw new Error(`Unsupported platform type: ${type}`);
    }

    await platform.initialize(config);
    return platform;
  }
}