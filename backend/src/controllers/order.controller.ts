import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { createError } from '../middleware/error';
import { generateOrderNumber, calculateOrderTotals } from '../utils/helpers';

const addressSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  scheduledDeliveryDate: z.string().optional(),
  scheduledDeliverySlot: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(1),
  })).optional(),
});

export async function createOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = checkoutSchema.parse(req.body);

    // Try DB cart first, then fall back to items from request body (frontend localStorage cart)
    const cartQuery = req.user?.id ? { user: req.user.id } : { sessionId: req.cookies?.sessionId };
    const cart = await Cart.findOne(cartQuery);
    const hasDbCart = cart && cart.items.length > 0;
    const hasBodyItems = data.items && data.items.length > 0;

    if (!hasDbCart && !hasBodyItems) throw createError('Cart is empty', 400);

    // Verify stock and build order items
    const orderItems = [];
    let discountAmount = 0;

    if (hasDbCart) {
      // Use DB cart items
      for (const item of cart!.items) {
        const product = await Product.findById(item.product);
        if (!product || !product.isActive) throw createError(`Product "${item.name}" is no longer available`, 400);
        if (product.inventory < item.quantity) throw createError(`Insufficient stock for "${item.name}"`, 400);

        orderItems.push({
          product: product._id,
          variantId: item.variantId,
          productName: product.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image: item.image,
        });
      }
    } else {
      // Use request body items (frontend localStorage cart)
      for (const item of data.items!) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) throw createError(`Product is no longer available`, 400);
        if (product.inventory < item.quantity) throw createError(`Insufficient stock for "${product.name}"`, 400);

        // Resolve variant price modifier
        let price = product.price;
        let variantId = item.variantId;
        if (variantId && product.variants && product.variants.length > 0) {
          const variant = product.variants.find((v: any) => (v._id?.toString() || v.id) === variantId);
          if (variant) {
            price += (variant.priceModifier ?? 0);
          }
        }

        const images = product.images || (product as any).product_images || [];
        const primaryImg = images.find((img: any) => img.isPrimary || img.is_primary) ?? images[0];

        orderItems.push({
          product: product._id,
          variantId: variantId || undefined,
          productName: product.name,
          price,
          quantity: item.quantity,
          total: price * item.quantity,
          image: primaryImg?.url,
        });
      }
    }

    // Apply coupon
    const couponCode = data.couponCode || (hasDbCart ? cart!.couponCode : undefined);
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
        } else {
          discountAmount = coupon.discountValue;
        }
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } });
      }
    }

    const shippingAmount = 99; // Fixed shipping for now
    const { subtotal, taxAmount, total } = calculateOrderTotals(
      orderItems.map((i) => ({ price: i.price, quantity: i.quantity })),
      discountAmount,
      shippingAmount
    );

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user?.id,
      guestEmail: data.shippingAddress.email,
      items: orderItems,
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      total,
      couponCode,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      paymentMethod: data.paymentMethod,
      status: (data.razorpayPaymentId || data.paymentMethod === 'test_bypass') ? 'confirmed' : 'pending',
      paymentStatus: (data.razorpayPaymentId || data.paymentMethod === 'test_bypass') ? 'paid' : 'pending',
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      scheduledDeliveryDate: data.scheduledDeliveryDate ? new Date(data.scheduledDeliveryDate) : undefined,
      scheduledDeliverySlot: data.scheduledDeliverySlot,
      notes: data.notes,
      statusHistory: [{ status: (data.razorpayPaymentId || data.paymentMethod === 'test_bypass') ? 'confirmed' : 'pending', message: (data.razorpayPaymentId || data.paymentMethod === 'test_bypass') ? (data.paymentMethod === 'test_bypass' ? 'Test order — payment bypassed' : 'Payment received via Razorpay') : 'Order placed', timestamp: new Date() }],
    });

    // Reduce inventory
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { inventory: -item.quantity, soldCount: item.quantity },
      });
    }

    // Clear DB cart if it existed
    if (hasDbCart) {
      await Cart.findByIdAndUpdate(cart!._id, { items: [], couponCode: undefined });
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function getOrders(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = req.user?.role === 'admin' ? {} : { user: req.user?.id };
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);
    res.json({ success: true, data: orders, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
}

export async function getOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const query: any = { orderNumber: req.params.orderNumber };
    if (req.user?.role !== 'admin') query.user = req.user?.id;

    const order = await Order.findOne(query).populate('items.product', 'name images slug').lean();
    if (!order) throw createError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, message } = z.object({ status: z.string(), message: z.string().optional() }).parse(req.body);
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: { statusHistory: { status, message, timestamp: new Date() } },
        ...(status === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
      { new: true }
    );
    if (!order) throw createError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function cancelOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) throw createError('Order not found', 404);

    // Only the order owner or an admin can cancel
    if (req.user?.role !== 'admin' && order.user?.toString() !== req.user?.id) {
      throw createError('You are not authorized to cancel this order', 403);
    }

    // Only allow cancellation if no delivery partner has accepted
    if (order.assignedDeliveryPartner) {
      throw createError('Cannot cancel — a delivery partner has already been assigned. Please contact support.', 400);
    }

    // Only allow cancellation for pending/confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw createError(`Cannot cancel an order with status "${order.status}". Only pending or confirmed orders can be cancelled.`, 400);
    }

    // Cancel the order
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      message: req.body?.reason ? `Cancelled by customer: ${req.body.reason}` : 'Order cancelled by customer',
      timestamp: new Date(),
    });

    await order.save();

    // Restore inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { inventory: item.quantity, soldCount: -item.quantity },
      });
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}
