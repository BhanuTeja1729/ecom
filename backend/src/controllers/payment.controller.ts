import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { createError } from '../middleware/error';

/**
 * Verify Cashfree payment status for an order
 */
export async function verifyCashfreePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      throw createError('Order number is required', 400);
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      throw createError('Order not found', 404);
    }

    // If order is already verified as paid, skip and return success
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Payment already verified as paid.',
        data: order,
      });
    }

    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

    const cashfreeUrl = cashfreeEnv === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderNumber}`
      : `https://sandbox.cashfree.com/pg/orders/${orderNumber}`;

    const response = await fetch(cashfreeUrl, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': cashfreeAppId || '',
        'x-client-secret': cashfreeSecret || '',
      },
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as any;
      console.error('Cashfree order verification API error:', errBody);
      throw createError(errBody.message || `Cashfree returned HTTP ${response.status}`, 400);
    }

    const responseData = (await response.json()) as any;
    const orderStatus = responseData.order_status;

    if (orderStatus === 'PAID') {
      // Payment successful
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        message: 'Online payment completed successfully via Cashfree.',
        timestamp: new Date(),
      });
      await order.save();

      // Clear the DB cart for the user or guest session
      const cartQuery = order.user ? { user: order.user } : { sessionId: req.cookies?.sessionId };
      await Cart.findOneAndUpdate(cartQuery, { items: [], couponCode: undefined });

      return res.json({
        success: true,
        message: 'Payment verified and order confirmed.',
        data: order,
      });
    } else {
      // Handle payment expiry or termination (failure)
      if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          message: `Order payment failed or session expired. Cashfree status: ${orderStatus}`,
          timestamp: new Date(),
        });
        await order.save();

        // Restore inventory back to stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { inventory: item.quantity, soldCount: -item.quantity },
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: `Payment verification failed. Cashfree order status: ${orderStatus}`,
        orderStatus,
      });
    }
  } catch (err) {
    next(err);
  }
}
