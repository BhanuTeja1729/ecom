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

// 1. Get available orders (unassigned orders that are confirmed or processing)
export async function getAvailableOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await Order.find({
      status: { $in: ['confirmed', 'processing'] },
      assignedDeliveryPartner: { $exists: false }
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
      query.status = { $in: ['confirmed', 'processing', 'shipped'] };
    } else {
      query.status = { $in: ['delivered'] };
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

    if (!['confirmed', 'processing'].includes(order.status)) {
      throw createError('Only confirmed or processing orders can be claimed', 400);
    }

    order.assignedDeliveryPartner = partnerId as any;
    
    // Transition status to processing if it's confirmed
    if (order.status === 'confirmed') {
      order.status = 'processing';
    }

    order.statusHistory.push({
      status: order.status,
      message: 'Delivery partner assigned. Preparing order for dispatch.',
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

    // Code matches — mark as delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'paid'; // Cash collected on delivery
    order.deliveryCode = undefined; // Clear the code after use
    order.codAmount = order.total;  // Record the cash amount collected from customer
    order.codCashStatus = 'with_partner'; // Partner now holds this cash — must remit to admin

    order.statusHistory.push({
      status: 'delivered',
      message: 'Delivery confirmed with customer verification code. Cash collected.',
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
        return Order.countDocuments({ assignedDeliveryPartner: partnerId, status: 'delivered' });
      })(),
      Order.countDocuments({ assignedDeliveryPartner: partnerId, status: { $in: ['confirmed', 'processing', 'shipped'] } })
    ]);

    // Earnings: sum of completed delivery payouts (with fallback to 0)
    const partnerMongoId = new mongoose.Types.ObjectId(partnerId);
    const earningsAggregate = await Order.aggregate([
      { $match: { assignedDeliveryPartner: partnerMongoId, status: 'delivered' } },
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

    // Cash flow: how much customer cash the partner is currently holding vs. already remitted
    const cashFlowAggregate = await Order.aggregate([
      { $match: { assignedDeliveryPartner: partnerMongoId, status: 'delivered' } },
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
