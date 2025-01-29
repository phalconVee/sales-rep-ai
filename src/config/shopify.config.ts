import env from './env.config';

export const shopifyConfig = {
  apiKey: env.SHOPIFY_API_KEY,
  apiSecret: env.SHOPIFY_API_SECRET,
  apiVersion: '2024-01'
};

export default shopifyConfig;