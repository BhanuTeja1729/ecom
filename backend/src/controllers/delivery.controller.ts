import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { createError } from '../middleware/error';

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

// 4. Update order delivery status (e.g. from processing -> shipped (out for delivery) -> delivered)
export async function updateDeliveryStatus(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const { id } = req.params;
    const { status, message } = z.object({
      status: z.enum(['processing', 'shipped', 'delivered']),
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
      defaultMsg = 'Order is picked up and is out for delivery.';
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid'; // Assumed paid upon delivery if COD, or already paid
      defaultMsg = 'Order delivered successfully.';
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

// 5. Get delivery partner statistics (earnings, active delivery count, completed delivery count)
export async function getDeliveryStats(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) throw createError('Unauthorized access', 401);

    const [completedCount, activeCount] = await Promise.all([
      Order.countDocuments({ assignedDeliveryPartner: partnerId, status: 'delivered' }),
      Order.countDocuments({ assignedDeliveryPartner: partnerId, status: { $in: ['confirmed', 'processing', 'shipped'] } })
    ]);

    // Earnings: ₹75 per completed delivery
    const earningsPerDelivery = 75;
    const totalEarnings = completedCount * earningsPerDelivery;

    res.json({
      success: true,
      data: {
        completedCount,
        activeCount,
        totalEarnings,
        earningsPerDelivery
      }
    });
  } catch (err) {
    next(err);
  }
}
