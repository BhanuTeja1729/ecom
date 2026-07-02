import { Router } from 'express';
import { getProfile, updateProfile, getWishlist, toggleWishlist, getAdminStats, getAllUsers, getCustomers, getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner, getAddresses, addAddress, updateAddress, deleteAddress, getDeliveryRate, updateDeliveryRate, payDeliveryPartnerSalary, verifyDeliveryPartnerPayout, recordRemittance } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist/toggle', authenticate, toggleWishlist);

// Addresses
router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, addAddress);
router.put('/addresses/:addressId', authenticate, updateAddress);
router.delete('/addresses/:addressId', authenticate, deleteAddress);

// Admin
router.get('/admin/stats', authenticate, requireAdmin, getAdminStats);
router.get('/admin/all', authenticate, requireAdmin, getAllUsers);
router.get('/admin/customers', authenticate, requireAdmin, getCustomers);
router.get('/admin/delivery-partners', authenticate, requireAdmin, getDeliveryPartners);
router.post('/admin/delivery-partners', authenticate, requireAdmin, createDeliveryPartner);
router.put('/admin/delivery-partners/:id', authenticate, requireAdmin, updateDeliveryPartner);
router.delete('/admin/delivery-partners/:id', authenticate, requireAdmin, deleteDeliveryPartner);
router.post('/admin/delivery-partners/verify-payout', authenticate, requireAdmin, verifyDeliveryPartnerPayout);
router.post('/admin/delivery-partners/:id/pay', authenticate, requireAdmin, payDeliveryPartnerSalary);
router.post('/admin/delivery-partners/:id/remit', authenticate, requireAdmin, recordRemittance);
router.get('/admin/delivery-rate', authenticate, getDeliveryRate);
router.post('/admin/delivery-rate', authenticate, requireAdmin, updateDeliveryRate);

export default router;
