import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Extend Express Request to include user property globally
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
  } catch {
    // Token invalid — proceed as guest
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}

// Re-export AuthRequest for backward compatibility with controllers that use it
export type AuthRequest = Request;
