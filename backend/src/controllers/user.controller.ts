import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { createError } from '../middleware/error';
import { Setting } from '../models/Setting';

export async function getProfile(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  upiId: z.string().trim().max(100).optional(),
  shippingAddress: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export async function updateProfile(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    console.log('[updateProfile] Updating profile for user:', req.user.id, 'with data:', data);
    const user = await User.findByIdAndUpdate(req.user.id, data, { new: true }).lean();
    console.log('[updateProfile] Updated user document:', user);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function getWishlist(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).populate('wishlist', 'name slug price images ratingAvg').lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user.wishlist });
  } catch (err) { next(err); }
}

export async function toggleWishlist(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { productId } = z.object({ productId: z.string() }).parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);

    const idx = user.wishlist.findIndex((id) => id.toString() === productId);
    let action: string;
    if (idx > -1) {
      user.wishlist.splice(idx, 1);
      action = 'removed';
    } else {
      user.wishlist.push(productId as any);
      action = 'added';
    }
    await user.save();
    res.json({ success: true, data: { action, wishlist: user.wishlist } });
  } catch (err) { next(err); }
}

// Admin controllers
export async function getAdminStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [totalOrders, totalRevenue, totalProducts, totalUsers] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'customer' }),
    ]);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'fullName email').lean();

    const monthlySales = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProducts,
        totalUsers,
        recentOrders,
        monthlySales,
      },
    });
  } catch (err) { next(err); }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = parseInt(limit);
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      User.countDocuments(),
    ]);
    res.json({ success: true, data: users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
}

// ─── Admin: Customers ────────────────────────────────────────────────────────

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', search = '' } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = parseInt(limit);

    const filter: any = { role: 'customer' };
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate order stats for these customers
    const customerIds = customers.map(c => c._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: customerIds } } },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap: Record<string, any> = {};
    orderStats.forEach(s => { statsMap[s._id.toString()] = s; });

    const data = customers.map(c => ({
      ...c,
      orderCount: statsMap[c._id.toString()]?.orderCount ?? 0,
      totalSpent: statsMap[c._id.toString()]?.totalSpent ?? 0,
      lastOrderAt: statsMap[c._id.toString()]?.lastOrderAt ?? null,
    }));

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

// ─── Admin: Delivery Partners ────────────────────────────────────────────────

export async function getDeliveryPartners(req: Request, res: Response, next: NextFunction) {
  try {
    // Run dynamic migration for any orders missing delivery distance or payout using updateOne (bypasses validation)
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
        const rate = await Setting.findOne({ key: 'flatDeliveryPayout' });
        const rateVal = rate ? rate.value : 50;
        for (const order of missingOrders) {
          const distance = order.deliveryDistanceKm ?? 5.0;
          await Order.updateOne(
            { _id: order._id },
            { $set: { deliveryDistanceKm: distance, deliveryPayout: rateVal } }
          );
        }
      }
    } catch (migErr) {
      console.error('[Migration] Dynamic update in admin failed:', migErr);
    }

    const partners = await User.find({ role: 'delivery_partner' }).sort({ createdAt: -1 }).lean();

    // Aggregate delivery stats for all partners
    const partnerIds = partners.map(p => p._id);
    const deliveryStats = await Order.aggregate([
      { $match: { assignedDeliveryPartner: { $in: partnerIds } } },
      {
        $group: {
          _id: '$assignedDeliveryPartner',
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          activeCount: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'processing', 'shipped']] }, 1, 0] } },
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                { $ifNull: ['$deliveryPayout', 0] },
                0
              ]
            }
          },
          unpaidEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $ne: ['$deliveryPayoutStatus', 'paid'] }
                  ]
                },
                { $ifNull: ['$deliveryPayout', 0] },
                0
              ]
            }
          },
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
        },
      },
    ]);

    const statsMap: Record<string, any> = {};
    deliveryStats.forEach(s => { statsMap[s._id.toString()] = s; });

    const data = partners.map(p => ({
      ...p,
      completedDeliveries: statsMap[p._id.toString()]?.completedCount ?? 0,
      activeDeliveries: statsMap[p._id.toString()]?.activeCount ?? 0,
      totalEarnings: statsMap[p._id.toString()]?.totalEarnings ?? 0,
      unpaidEarnings: statsMap[p._id.toString()]?.unpaidEarnings ?? 0,
      cashInHand: statsMap[p._id.toString()]?.cashInHand ?? 0,
      cashRemitted: statsMap[p._id.toString()]?.cashRemitted ?? 0,
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

const deliveryPartnerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
});

export async function createDeliveryPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = deliveryPartnerSchema.parse(req.body);
    if (!data.password) throw createError('Password is required for new delivery partner', 400);

    const existing = await User.findOne({ email: data.email });
    if (existing) throw createError('A user with this email already exists', 409);

    const partner = await User.create({
      ...data,
      role: 'delivery_partner',
      isVerified: true,
      isActive: true,
    });

    const result = partner.toObject();
    delete (result as any).password;
    delete (result as any).refreshTokens;

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

const updatePartnerSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function updateDeliveryPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = updatePartnerSchema.parse(req.body);

    const partner = await User.findOne({ _id: id, role: 'delivery_partner' });
    if (!partner) throw createError('Delivery partner not found', 404);

    Object.assign(partner, data);
    await partner.save();

    const result = partner.toObject();
    delete (result as any).password;
    delete (result as any).refreshTokens;

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function deleteDeliveryPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const partner = await User.findOne({ _id: id, role: 'delivery_partner' });
    if (!partner) throw createError('Delivery partner not found', 404);

    // Check for active deliveries
    const activeOrders = await Order.countDocuments({
      assignedDeliveryPartner: id,
      status: { $in: ['confirmed', 'processing', 'shipped'] },
    });
    if (activeOrders > 0) {
      throw createError(`Cannot delete: partner has ${activeOrders} active delivery(ies)`, 400);
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'Delivery partner deleted' });
  } catch (err) { next(err); }
}

// ─── Address CRUD ────────────────────────────────────────────────────────────

export async function getAddresses(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user.addresses || [] });
  } catch (err) { next(err); }
}

const addressBodySchema = z.object({
  label: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
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

export async function addAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = addressBodySchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    user.addresses.push(data as any);
    await user.save();
    res.status(201).json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}

export async function updateAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = addressBodySchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    const addr = (user.addresses as any).id(req.params.addressId);
    if (!addr) throw createError('Address not found', 404);
    Object.assign(addr, data);
    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}

export async function deleteAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    const addr = (user.addresses as any).id(req.params.addressId);
    if (!addr) throw createError('Address not found', 404);
    addr.deleteOne();
    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}

export async function getDeliveryRate(req: Request, res: Response, next: NextFunction) {
  try {
    const rate = await Setting.findOne({ key: 'flatDeliveryPayout' });
    res.json({ success: true, data: rate ? rate.value : 50 }); // default to ₹50
  } catch (err) { next(err); }
}

export async function updateDeliveryRate(req: Request, res: Response, next: NextFunction) {
  try {
    const { rate } = z.object({ rate: z.number().min(0) }).parse(req.body);
    await Setting.findOneAndUpdate(
      { key: 'flatDeliveryPayout' },
      { value: rate },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Flat delivery payout updated successfully', data: rate });
  } catch (err) { next(err); }
}

export async function payDeliveryPartnerSalary(req: Request, res: Response, next: NextFunction) {
  try {
    const partnerId = req.params.id;
    const partner = await User.findOne({ _id: partnerId, role: 'delivery_partner' });
    if (!partner) throw createError('Delivery partner not found', 404);

    // Update all delivered, unpaid orders of this partner to paid
    const result = await Order.updateMany(
      { assignedDeliveryPartner: partnerId, status: 'delivered', deliveryPayoutStatus: { $ne: 'paid' } },
      { $set: { deliveryPayoutStatus: 'paid' } }
    );

    res.json({
      success: true,
      message: `Salary paid successfully. Updated ${result.modifiedCount} orders.`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) { next(err); }
}

// ─── Admin: Record COD Cash Remittance ──────────────────────────────────────

export async function recordRemittance(req: Request, res: Response, next: NextFunction) {
  try {
    const partnerId = req.params.id;
    const partner = await User.findOne({ _id: partnerId, role: 'delivery_partner' });
    if (!partner) throw createError('Delivery partner not found', 404);

    // Find all orders where this partner is still holding the customer's COD cash
    const pendingOrders = await Order.find({
      assignedDeliveryPartner: partnerId,
      status: 'delivered',
      codCashStatus: 'with_partner',
    });

    if (pendingOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No pending COD cash remittance found for this partner.',
        remittedCount: 0,
        totalCash: 0,
      });
    }

    // Calculate the total cash being remitted
    const totalCash = pendingOrders.reduce((sum, o) => sum + (o.codAmount ?? o.total ?? 0), 0);

    // Mark all as remitted
    const result = await Order.updateMany(
      {
        assignedDeliveryPartner: partnerId,
        status: 'delivered',
        codCashStatus: 'with_partner',
      },
      { $set: { codCashStatus: 'remitted' } }
    );

    res.json({
      success: true,
      message: `Cash remittance recorded. ${result.modifiedCount} order(s) cleared, total ₹${totalCash}.`,
      remittedCount: result.modifiedCount,
      totalCash,
    });
  } catch (err) { next(err); }
}
