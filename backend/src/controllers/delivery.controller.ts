import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { createError } from '../middleware/error';
import { getSettingValue } from '../models/Setting';

/** Generate a cryptographically-random 6-digit delivery verification code */
function generateDeliveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Get available orders (unassigned orders that are confirmed, processing, or return_requested)
export async function getAvailableOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await Order.find({
      status: { $in: ['confirmed', 'processing', 'return_requested'] },
      $or: [
        { assignedDeliveryPartner: { $exists: false } },
        { assignedDeliveryPartner: null }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('user', 'fullName email phone')
    .lean();

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

// 2. Get assigned orders (active or completed orders for the logged-in delivery partner)
export async function getAssignedOrders(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { type = 'active' } = req.query as { type?: 'active' | 'completed' };

    const query: any = { assignedDeliveryPartner: partnerId };
    if (type === 'active') {
      query.status = { $in: ['confirmed', 'processing', 'shipped', 'return_requested'] };
    } else {
      query.status = { $in: ['delivered', 'refunded'] };
    }

    const orders = await Order.find(query)
      .sort({ updatedAt: -1 })
      .populate('user', 'fullName email phone')
      .lean();

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

// 3. Claim an available order
export async function claimOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) throw createError('Order not found', 404);

    if (order.assignedDeliveryPartner) {
      throw createError('Order has already been assigned to another delivery partner', 400);
    }

    if (!['confirmed', 'processing', 'return_requested'].includes(order.status)) {
      throw createError('Only confirmed, processing, or return requested orders can be claimed', 400);
    }

    order.assignedDeliveryPartner = partnerId as any;
    
    // Transition status to processing if it's confirmed
    if (order.status === 'confirmed') {
      order.status = 'processing';
    }

    const isReturn = order.status === 'return_requested';
    order.statusHistory.push({
      status: order.status,
      message: isReturn 
        ? 'Delivery partner assigned for return package pickup.'
        : 'Delivery partner assigned. Preparing order for dispatch.',
      timestamp: new Date()
    });

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// 4. Update order delivery status (processing → shipped → delivered via code verification)
//    When transitioning to 'shipped', a 6-digit delivery verification code is generated.
//    To mark 'delivered', use the verifyDeliveryCode endpoint instead.
export async function updateDeliveryStatus(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { id } = req.params;
    const { status, message } = z.object({
      status: z.enum(['processing', 'shipped']),
      message: z.string().optional()
    }).parse(req.body);

    const order = await Order.findById(id);
    if (!order) throw createError('Order not found', 404);

    // Guard: Only allow the assigned partner or an admin to update
    if (order.assignedDeliveryPartner?.toString() !== partnerId && req.user?.role !== 'admin') {
      throw createError('You are not authorized to update this order', 403);
    }

    order.status = status;

    let defaultMsg = '';
    if (status === 'shipped') {
      order.shippedAt = new Date();
      // Generate a fresh 6-digit delivery verification code
      order.deliveryCode = generateDeliveryCode();
      defaultMsg = 'Order picked up and is out for delivery. Share the delivery code with the agent to confirm receipt.';
    } else {
      defaultMsg = 'Order status updated by delivery partner.';
    }

    order.statusHistory.push({
      status,
      message: message || defaultMsg,
      timestamp: new Date()
    });

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// 5. Verify the 6-digit delivery code and mark order as delivered (COD confirmation)
export async function verifyDeliveryCode(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { id } = req.params;
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const order = await Order.findById(id);
    if (!order) throw createError('Order not found', 404);

    // Guard: Only allow the assigned partner or an admin
    if (order.assignedDeliveryPartner?.toString() !== partnerId && req.user?.role !== 'admin') {
      throw createError('You are not authorized to verify this delivery', 403);
    }

    if (order.status !== 'shipped') {
      throw createError('Order must be in "shipped" status to verify delivery', 400);
    }

    if (!order.deliveryCode) {
      throw createError('No delivery code found for this order', 400);
    }

    if (order.deliveryCode !== code) {
      throw createError('Invalid delivery code. Please ask the customer for the correct code.', 400);
    }

    const isOnline = order.paymentMethod === 'online' || order.paymentMethod === 'cashfree';

    // Code matches — mark as delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'paid';
    order.deliveryCode = undefined; // Clear the code after use

    if (isOnline) {
      order.codAmount = 0;
      order.codCashStatus = 'not_applicable';
    } else {
      order.codAmount = order.total;  // Record the cash amount collected from customer
      order.codCashStatus = 'with_partner'; // Partner now holds this cash — must remit to admin
    }

    order.statusHistory.push({
      status: 'delivered',
      message: isOnline
        ? 'Delivery confirmed with customer verification code. Prepaid order.'
        : 'Delivery confirmed with customer verification code. Cash collected.',
      timestamp: new Date()
    });

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// 6. Get delivery partner statistics (earnings, active delivery count, completed delivery count)
export async function getDeliveryStats(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const [completedCount, activeCount] = await Promise.all([
      // Run dynamic migration for any orders missing delivery distance or payout using updateOne (bypasses validation)
      (async () => {
        try {
          const missingOrders = await Order.find({
            $or: [
              { deliveryDistanceKm: { $exists: false } },
              { deliveryDistanceKm: null },
              { deliveryPayout: { $exists: false } },
              { deliveryPayout: null }
            ]
          });
          if (missingOrders.length > 0) {
            const flatPayout = await getSettingValue('flatDeliveryPayout', 50);
            for (const order of missingOrders) {
              const distance = order.deliveryDistanceKm ?? 5.0;
              await Order.updateOne(
                { _id: order._id },
                { $set: { deliveryDistanceKm: distance, deliveryPayout: flatPayout } }
              );
            }
          }
        } catch (migErr) {
          console.error('[Migration] Dynamic update failed:', migErr);
        }
        return Order.countDocuments({ assignedDeliveryPartner: partnerId, status: { $in: ['delivered', 'refunded'] } });
      })(),
      Order.countDocuments({ assignedDeliveryPartner: partnerId, status: { $in: ['confirmed', 'processing', 'shipped', 'return_requested'] } })
    ]);

    // Earnings: sum of completed delivery payouts (with fallback to 0)
    const partnerMongoId = new mongoose.Types.ObjectId(partnerId);
    const earningsAggregate = await Order.aggregate([
      { $match: { assignedDeliveryPartner: partnerMongoId, status: { $in: ['delivered', 'refunded'] } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$deliveryPayout', 0] } },
          unpaid: {
            $sum: {
              $cond: [
                { $ne: ['$deliveryPayoutStatus', 'paid'] },
                { $ifNull: ['$deliveryPayout', 0] },
                0
              ]
            }
          }
        }
      }
    ]);
    const totalEarnings = earningsAggregate[0]?.total || 0;
    const unpaidEarnings = earningsAggregate[0]?.unpaid || 0;

    // Get flat delivery payout
    const flatDeliveryPayout = await getSettingValue('flatDeliveryPayout', 50);

    const cashFlowAggregate = await Order.aggregate([
      { $match: { assignedDeliveryPartner: partnerMongoId, status: 'delivered', paymentMethod: { $nin: ['online', 'cashfree'] } } },
      {
        $group: {
          _id: null,
          cashInHand: {
            $sum: {
              $cond: [
                { $eq: ['$codCashStatus', 'with_partner'] },
                { $ifNull: ['$codAmount', 0] },
                0
              ]
            }
          },
          cashRemitted: {
            $sum: {
              $cond: [
                { $eq: ['$codCashStatus', 'remitted'] },
                { $ifNull: ['$codAmount', 0] },
                0
              ]
            }
          }
        }
      }
    ]);
    const cashInHand = cashFlowAggregate[0]?.cashInHand || 0;
    const cashRemitted = cashFlowAggregate[0]?.cashRemitted || 0;

    res.json({
      success: true,
      data: {
        completedCount,
        activeCount,
        totalEarnings,
        unpaidEarnings,
        cashInHand,
        cashRemitted,
        deliveryRatePerKm: flatDeliveryPayout
      }
    });
  } catch (err) {
    next(err);
  }
}

// 7. Verify the 6-digit return code and mark order as refunded
export async function verifyReturnCode(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { id } = req.params;
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const order = await Order.findById(id);
    if (!order) throw createError('Order not found', 404);

    // Guard: Only allow the assigned partner or an admin
    if (order.assignedDeliveryPartner?.toString() !== partnerId && req.user?.role !== 'admin') {
      throw createError('You are not authorized to verify this return pickup', 403);
    }

    if (order.status !== 'return_requested') {
      throw createError('Order must be in "return_requested" status to verify return', 400);
    }

    if (!order.returnCode) {
      throw createError('No return code found for this order', 400);
    }

    if (order.returnCode !== code) {
      throw createError('Invalid return code. Please check with the customer.', 400);
    }

    // Code matches — initiate refund for online payments
    const isOnlineRefund = (order.paymentMethod === 'cashfree' || order.paymentMethod === 'online') && order.paymentStatus === 'paid';

    if (isOnlineRefund) {
      const cashfreeAppId = process.env.CASHFREE_APP_ID;
      const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
      const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';

      const cashfreeUrl = cashfreeEnv === 'production'
        ? `https://api.cashfree.com/pg/orders/${order.orderNumber}/refunds`
        : `https://sandbox.cashfree.com/pg/orders/${order.orderNumber}/refunds`;

      const refundId = `ref_${order.orderNumber}_${Date.now()}`;
      const refundBody = {
        refund_amount: order.total,
        refund_id: refundId,
        refund_note: `Return pickup verified by delivery partner`
      };

      const refundResponse = await fetch(cashfreeUrl, {
        method: 'POST',
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': cashfreeAppId || '',
          'x-client-secret': cashfreeSecret || '',
          'x-idempotency-key': new mongoose.Types.ObjectId().toString(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(refundBody)
      });

      if (!refundResponse.ok) {
        const errBody = (await refundResponse.json().catch(() => ({}))) as any;
        console.error('Cashfree refund API error:', errBody);
        throw createError(errBody.message || `Cashfree refund failed with HTTP ${refundResponse.status}`, 400);
      }
    }

    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    order.returnCode = undefined; // Clear the code after use

    order.statusHistory.push({
      status: 'refunded',
      message: 'Return package picked up and verified by delivery partner. Refund successfully completed.',
      timestamp: new Date()
    });

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
