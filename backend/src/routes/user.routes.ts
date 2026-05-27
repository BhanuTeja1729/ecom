import { Router } from 'express';
import { getProfile, updateProfile, getWishlist, toggleWishlist, getAdminStats, getAllUsers } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist/toggle', authenticate, toggleWishlist);

// Admin
router.get('/admin/stats', authenticate, requireAdmin, getAdminStats);
router.get('/admin/all', authenticate, requireAdmin, getAllUsers);

export default router;
