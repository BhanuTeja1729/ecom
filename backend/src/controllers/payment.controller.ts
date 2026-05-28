import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createError } from '../middleware/error';

// Lazy-init Razorpay instance (avoids crash if keys are missing)
let razorpayInstance: any = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw createError('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env', 500);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayInstance;
}

/**
 * POST /api/v1/payment/create-order
 * Creates a Razorpay order for the given amount (in paise).
 */
export async function createRazorpayOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) throw createError('Invalid amount', 400);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount), // amount in paise (e.g. ₹100 = 10000)
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/payment/verify
 * Verifies the Razorpay payment signature using HMAC SHA256.
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw createError('Missing payment verification fields', 400);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw createError('Razorpay key secret not configured', 500);

    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw createError('Payment verification failed — invalid signature', 400);
    }

    res.json({
      success: true,
      data: {
        verified: true,
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
  } catch (err) { next(err); }
}
