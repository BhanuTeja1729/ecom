import { Router } from 'express';
import { register, login, refresh, logout, getMe, googleAuth } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);   // Google One Tap / OAuth
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;

