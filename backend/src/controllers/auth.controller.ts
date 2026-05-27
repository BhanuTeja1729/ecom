import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/helpers';
import { env } from '../config/env';
import { createError } from '../middleware/error';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { fullName, email, password } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already registered', 409);

    const user = await User.create({ fullName, email, password });

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    user.refreshTokens.push(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw createError('Invalid email or password', 401);
    }
    if (!user.isActive) throw createError('Account is deactivated', 403);

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    user.refreshTokens.push(refreshToken);
    // Keep only latest 5 refresh tokens
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw createError('Refresh token required', 401);

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(token)) {
      throw createError('Invalid refresh token', 401);
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    const newRefreshToken = generateRefreshToken({ id: user.id });
    user.refreshTokens.push(newRefreshToken);
    await user.save();
    setRefreshCookie(res, newRefreshToken);

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        await User.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: token } });
      } catch { /* token invalid — still clear cookie */ }
    }
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user?.id).lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/google
 *
 * Supports two flows:
 *  1. id_token / credential flow: { credential: <Google id_token> }
 *     — verifies the JWT directly with google-auth-library
 *  2. Implicit / access_token flow: { credential: <access_token>, profile: { sub, email, name, picture, email_verified } }
 *     — the FE already fetched userinfo; we trust it because the access_token is
 *       validated against Google's tokeninfo endpoint
 */
export async function googleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { credential, profile } = req.body;
    if (!credential) throw createError('Google credential token is required', 400);
    if (!env.GOOGLE_CLIENT_ID) throw createError('Google OAuth is not configured on this server', 503);

    let googleId: string;
    let email: string;
    let name: string | undefined;
    let picture: string | undefined;
    let email_verified: boolean;

    if (profile && profile.sub) {
      // ── Implicit flow: FE passed access_token + pre-fetched userinfo ──────
      // Verify the access_token is still valid with Google's tokeninfo endpoint
      const tokenInfo = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${credential}`
      );
      if (!tokenInfo.ok) throw createError('Invalid Google access token', 401);
      const info = await tokenInfo.json() as { audience?: string; issued_to?: string };
      // Make sure the token belongs to our app
      if (info.audience !== env.GOOGLE_CLIENT_ID && info.issued_to !== env.GOOGLE_CLIENT_ID) {
        throw createError('Google token audience mismatch', 401);
      }

      googleId = profile.sub;
      email = profile.email;
      name = profile.name;
      picture = profile.picture;
      email_verified = !!profile.email_verified;
    } else {
      // ── ID token flow: verify the JWT with google-auth-library ────────────
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw createError('Invalid Google token', 401);
      ({ sub: googleId, email, name, picture, email_verified } = payload as any);
    }

    // ── Upsert user ───────────────────────────────────────────────────────────
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatarUrl) user.avatarUrl = picture;
      if (email_verified) user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        googleId,
        email,
        fullName: name || email.split('@')[0],
        avatarUrl: picture,
        isVerified: !!email_verified,
      });
    }

    if (!user.isActive) throw createError('Account is deactivated', 403);

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    next(err);
  }
}
