import { Router } from 'express';
import { register, login, refresh, logout, getMe, googleAuth, auth0Auth } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);   // Google One Tap / OAuth
router.post('/auth0', auth0Auth);     // Auth0 Token Exchange
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;

