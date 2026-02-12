import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.userId = decoded.userId;
    next();
  });
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('optionalAuth: No token provided in Authorization header');
    return next(); // Continue without authentication
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
    if (err) {
      console.log('optionalAuth: Token verification failed:', err.message);
      // Token invalid or expired - continue without authentication
      return next();
    }

    if (decoded && decoded.userId) {
      req.userId = decoded.userId;
      console.log('optionalAuth: Token verified, userId extracted:', decoded.userId);
    } else {
      console.log('optionalAuth: Token decoded but no userId found in payload:', decoded);
    }
    next();
  });
};

