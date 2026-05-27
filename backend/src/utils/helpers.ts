import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function generateAccessToken(payload: { id: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES } as any);
}

export function generateRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES } as any);
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calculateOrderTotals(
  items: { price: number; quantity: number }[],
  discountAmount = 0,
  shippingAmount = 0,
  taxRate = 0.18
) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + shippingAmount + taxAmount;
  return { subtotal, taxAmount, total };
}
