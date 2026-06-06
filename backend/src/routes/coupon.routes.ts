import { Router } from 'express';
import { getCoupons, createCoupon, deleteCoupon, getAvailableCoupons } from '../controllers/coupon.controller';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// Customer/Public routes (must be before requireAdmin check)
router.get('/available', optionalAuth, getAvailableCoupons);

// Admin-only routes
router.use(authenticate, requireAdmin);

router.get('/', getCoupons);
router.post('/', createCoupon);
router.delete('/:id', deleteCoupon);

export default router;
