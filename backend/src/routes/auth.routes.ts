import { Router } from 'express';
import { register, login, refresh, logout, getMe, googleAuth, auth0Auth, forgotPassword, resetPassword, sendOtp, verifyOtp, updatePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/google', googleAuth);   // Google One Tap / OAuth
router.post('/auth0', auth0Auth);     // Auth0 Token Exchange
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.put('/update-password', authenticate, updatePassword);

export default router;

