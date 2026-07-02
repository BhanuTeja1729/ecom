import { Router } from 'express';
import {
  getAvailableOrders,
  getAssignedOrders,
  claimOrder,
  updateDeliveryStatus,
  verifyDeliveryCode,
  getDeliveryStats,
  verifyReturnCode
} from '../controllers/delivery.controller';
import { authenticate, requireDeliveryPartner } from '../middleware/auth';

const router = Router();

// Apply auth and role-check middleware to all delivery routes
router.use(authenticate);
router.use(requireDeliveryPartner);

router.get('/orders/available', getAvailableOrders);
router.get('/orders/assigned', getAssignedOrders);
router.put('/orders/:id/claim', claimOrder);
router.put('/orders/:id/status', updateDeliveryStatus);
router.post('/orders/:id/verify-code', verifyDeliveryCode);
router.post('/orders/:id/verify-return', verifyReturnCode);
router.get('/stats', getDeliveryStats);

export default router;
