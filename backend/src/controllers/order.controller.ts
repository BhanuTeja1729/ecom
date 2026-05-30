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
});

export async function createOrder(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = checkoutSchema.parse(req.body);
    const cartQuery = req.user?.id ? { user: req.user.id } : { sessionId: req.cookies?.sessionId };
    const cart = await Cart.findOne(cartQuery);
    if (!cart || cart.items.length === 0) throw createError('Cart is empty', 400);

    // Verify stock and build order items
    const orderItems = [];
    let discountAmount = 0;

    for (const item of cart.items) {
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

    // Apply coupon
    const couponCode = data.couponCode || cart.couponCode;
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
      paymentStatus: data.razorpayPaymentId ? 'paid' : 'pending',
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      scheduledDeliveryDate: data.scheduledDeliveryDate ? new Date(data.scheduledDeliveryDate) : undefined,
      scheduledDeliverySlot: data.scheduledDeliverySlot,
      notes: data.notes,
      statusHistory: [{ status: data.razorpayPaymentId ? 'confirmed' : 'pending', message: data.razorpayPaymentId ? 'Payment received via Razorpay' : 'Order placed', timestamp: new Date() }],
    });

    // Reduce inventory
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { inventory: -item.quantity, soldCount: item.quantity },
      });
    }

    // Clear cart
    await Cart.findByIdAndUpdate(cart._id, { items: [], couponCode: undefined });

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
