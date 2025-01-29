// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { parseJwt } from '../utils/helpers';
import env from '../config/env.config';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'Authentication required');
    }

    const payload = parseJwt(token);
    req.user = {
      id: payload.sub as string,
      role: payload.role as string
    };

    next();
  } catch (error) {
    next(new AppError(401, 'Invalid token'));
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    next();
  };
};