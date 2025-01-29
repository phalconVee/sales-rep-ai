import jwt from 'jsonwebtoken';
import env from '../config/env.config';

export function generateToken(shopId: number) {
  return jwt.sign(
    {
      shopId: shopId,
      type: 'widget',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days expiry
    },
    env.JWT_SECRET
  );
}