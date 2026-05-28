import { Router } from 'express';
import { createRazorpayOrder, verifyPayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Both endpoints require authentication
router.post('/create-order', authenticate, createRazorpayOrder);
router.post('/verify', authenticate, verifyPayment);

export default router;
