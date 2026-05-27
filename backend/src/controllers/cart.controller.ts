import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { createError } from '../middleware/error';

function getCartQuery(req: Request & { user?: any }) {
  return req.user?.id ? { user: req.user.id } : { sessionId: req.cookies?.sessionId };
}

export async function getCart(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const query = getCartQuery(req);
    const cart = await Cart.findOne(query).populate('items.product', 'name slug price images inventory').lean();
    res.json({ success: true, data: cart || { items: [] } });
  } catch (err) { next(err); }
}

const addItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

export async function addToCart(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { productId, variantId, quantity } = addItemSchema.parse(req.body);

    const product = await Product.findById(productId).lean();
    if (!product || !product.isActive) throw createError('Product not found', 404);

    let price = product.price;
    if (variantId) {
      const variant = product.variants.find((v) => (v as any)._id?.toString() === variantId);
      if (variant) price += variant.priceModifier;
    }

    const query = getCartQuery(req);
    let cart = await Cart.findOne(query);
    if (!cart) {
      cart = new Cart({
        ...query,
        items: [],
      });
    }

    const existingIdx = cart.items.findIndex(
      (i) => i.product.toString() === productId && i.variantId === variantId
    );
    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      const img = product.images.find((i) => i.isPrimary) || product.images[0];
      cart.items.push({
        product: product._id as any,
        variantId,
        quantity,
        price,
        name: product.name,
        image: img?.url,
      });
    }

    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) { next(err); }
}

export async function updateCartItem(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { productId, variantId, quantity } = z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().min(0),
    }).parse(req.body);

    const query = getCartQuery(req);
    const cart = await Cart.findOne(query);
    if (!cart) throw createError('Cart not found', 404);

    const idx = cart.items.findIndex(
      (i) => i.product.toString() === productId && i.variantId === variantId
    );
    if (idx === -1) throw createError('Item not in cart', 404);

    if (quantity === 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) { next(err); }
}

export async function clearCart(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const query = getCartQuery(req);
    await Cart.findOneAndUpdate(query, { items: [], couponCode: undefined });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) { next(err); }
}

export async function applyCoupon(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string() }).parse(req.body);
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) throw createError('Invalid or expired coupon', 400);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw createError('Coupon expired', 400);
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw createError('Coupon usage limit reached', 400);

    const query = getCartQuery(req);
    await Cart.findOneAndUpdate(query, { couponCode: coupon.code });
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}
