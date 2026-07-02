import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { createError } from '../middleware/error';
import { getSettingValue } from '../models/Setting';
import { generateOrderNumber, calculateOrderTotals } from '../utils/helpers';

const addressSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  doorNo: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.string().default('cod'),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  scheduledDeliveryDate: z.string().optional(),
  scheduledDeliverySlot: z.string().optional(),
  deliveryDistance: z.number().optional(),
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
        if (req.user && coupon.usedBy && coupon.usedBy.map((id: any) => id.toString()).includes(req.user.id)) {
          throw createError('You have already used this coupon', 400);
        }
        const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
        if (coupon.minimumOrderAmount && subtotal < coupon.minimumOrderAmount) {
          throw createError(`Minimum order amount of ₹${coupon.minimumOrderAmount} is required for this coupon`, 400);
        }
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
        } else {
          discountAmount = coupon.discountValue;
        }
        const couponUpdate: any = { $inc: { usageCount: 1 } };
        if (req.user?.id) {
          couponUpdate.$push = { usedBy: req.user.id };
        }
        await Coupon.findByIdAndUpdate(coupon._id, couponUpdate);
      }
    }

    const calculatedSubtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const shippingAmount = calculatedSubtotal >= 999 ? 0 : 49;
    const { subtotal, taxAmount, total } = calculateOrderTotals(
      orderItems.map((i) => ({ price: i.price, quantity: i.quantity })),
      discountAmount,
      shippingAmount
    );

    const deliveryDistance = data.deliveryDistance ?? 0;
    const deliveryPayout = await getSettingValue('flatDeliveryPayout', 50);

    const paymentMethod = data.paymentMethod || 'cod';
    const isOnline = paymentMethod === 'online' || paymentMethod === 'cashfree';

    // COD orders are confirmed immediately, online payments start as pending
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
      paymentMethod,
      status: isOnline ? 'pending' : 'confirmed',
      paymentStatus: 'pending',
      scheduledDeliveryDate: data.scheduledDeliveryDate ? new Date(data.scheduledDeliveryDate) : undefined,
      scheduledDeliverySlot: data.scheduledDeliverySlot,
      notes: data.notes,
      deliveryDistanceKm: deliveryDistance,
      deliveryPayout,
      statusHistory: [{
        status: isOnline ? 'pending' : 'confirmed',
        message: isOnline ? 'Order placed. Payment pending.' : 'Order placed successfully. Pay cash on delivery.',
        timestamp: new Date(),
      }],
    });

    // Reduce inventory immediately to hold the items
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { inventory: -item.quantity, soldCount: item.quantity },
      });
    }

    // Clear DB cart if it existed (only immediately for COD. Online carts will clear upon payment verification success)
    if (hasDbCart && !isOnline) {
      await Cart.findByIdAndUpdate(cart!._id, { items: [], couponCode: undefined });
    }

    let paymentSessionId = '';

    if (isOnline) {
      try {
        const cashfreeAppId = process.env.CASHFREE_APP_ID;
        const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
        const cashfreeEnv = process.env.CASHFREE_ENV || 'sandbox';
        
        const cashfreeUrl = cashfreeEnv === 'production' 
          ? 'https://api.cashfree.com/pg/orders' 
          : 'https://sandbox.cashfree.com/pg/orders';

        // Strip non-numeric characters from phone and ensure it has 10 digits
        let phoneNum = order.shippingAddress.phone || req.user?.phone || '';
        phoneNum = phoneNum.replace(/\D/g, '');
        if (phoneNum.length > 10) {
          phoneNum = phoneNum.slice(-10);
        }
        if (phoneNum.length < 10) {
          phoneNum = '9999999999'; // Fallback phone number
        }

        const customerName = order.shippingAddress.fullName || req.user?.fullName || 'Guest Customer';

        const cashfreeBody = {
          order_id: order.orderNumber,
          order_amount: Number(order.total.toFixed(2)),
          order_currency: 'INR',
          customer_details: {
            customer_id: req.user?.id ? req.user.id.toString() : `guest_${Date.now()}`,
            customer_email: order.guestEmail || req.user?.email || 'guest@example.com',
            customer_phone: phoneNum,
            customer_name: customerName,
          },
          order_meta: {
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout-verify?order_id=${order.orderNumber}`
          }
        };

        const response = await fetch(cashfreeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': cashfreeAppId || '',
            'x-client-secret': cashfreeSecret || ''
          },
          body: JSON.stringify(cashfreeBody)
        });

        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as any;
          console.error('Cashfree order creation error:', errBody);
          throw new Error(errBody.message || `Cashfree API returned HTTP ${response.status}`);
        }

        const responseData = (await response.json()) as any;
        paymentSessionId = responseData.payment_session_id;

        // Save session id to paymentIntentId
        order.paymentIntentId = paymentSessionId;
        await order.save();
      } catch (err: any) {
        // Rollback inventory on failed session initiation
        for (const item of orderItems) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { inventory: item.quantity, soldCount: -item.quantity },
          });
        }
        // Rollback DB order
        await Order.findByIdAndDelete(order._id);
        throw createError(`Failed to initialize payment session: ${err.message}`, 500);
      }
    }

    res.status(201).json({ success: true, data: order, paymentSessionId });
  } catch (err) { next(err); }
}

export async function getOrders(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = (req.user?.role === 'admin' && req.query.all === 'true') ? {} : { user: req.user?.id };
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

export async function requestReturn(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { orderNumber } = req.params;
    const { reason, description } = z.object({
      reason: z.string().min(1, 'Reason is required'),
      description: z.string().optional()
    }).parse(req.body);

    const order = await Order.findOne({ orderNumber });
    if (!order) throw createError('Order not found', 404);

    // Only order owner or admin can request return
    if (req.user?.role !== 'admin' && order.user?.toString() !== req.user?.id) {
      throw createError('You are not authorized to return this order', 403);
    }

    // Only delivered orders can be returned
    if (order.status !== 'delivered') {
      throw createError('Only delivered orders can be returned', 400);
    }

    // Update status and details
    order.status = 'return_requested';
    // Clear delivery partner so any delivery partner can claim it as a return pickup task
    order.assignedDeliveryPartner = undefined;
    
    // Generate a new 6-digit return verification code
    order.returnCode = Math.floor(100000 + Math.random() * 900000).toString();
    order.returnReason = reason;
    order.returnDescription = description;

    order.statusHistory.push({
      status: 'return_requested',
      message: `Return requested. Reason: "${reason}". Package return pickup pending.`,
      timestamp: new Date()
    });

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

