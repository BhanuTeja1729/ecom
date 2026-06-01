import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/helpers';
import { env } from '../config/env';
import { createError } from '../middleware/error';
import crypto from 'crypto';
import { sendEmail, sendOtpEmail } from '../utils/email';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['customer', 'delivery_partner']).default('customer'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  loginRole: z.enum(['customer', 'delivery_partner']).optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  fullName: z.string().min(2).max(100),
  password: z.string().min(6).max(72),
  role: z.enum(['customer', 'delivery_partner']).default('customer'),
});

const otpStore = new Map<string, {
  otp: string;
  data: z.infer<typeof registerSchema>;
  expiresAt: number;
}>();

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: data.email });
    if (existing) throw createError('Email already registered', 409);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in memory for 5 minutes
    otpStore.set(data.email, {
      otp,
      data,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendOtpEmail(data.email, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp, fullName, password, role } = verifyOtpSchema.parse(req.body);

    const record = otpStore.get(email);
    if (!record) {
      throw createError('OTP expired or not requested. Please try again.', 400);
    }
    if (record.expiresAt < Date.now()) {
      otpStore.delete(email);
      throw createError('OTP has expired. Please request a new one.', 400);
    }
    if (record.otp !== otp) {
      throw createError('Invalid OTP code.', 400);
    }

    // OTP matches, we can clear it
    otpStore.delete(email);

    // Make sure email wasn't taken in the meantime
    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already registered', 409);

    const user = await User.create({ fullName, email, password, role, isVerified: true });

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

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { fullName, email, password, role } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already registered', 409);

    const user = await User.create({ fullName, email, password, role });

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
    const { email, password, loginRole } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw createError('Invalid email or password', 401);
    }
    if (!user.isActive) throw createError('Account is deactivated', 403);

    // Role-based tab validation
    if (loginRole === 'delivery_partner' && user.role !== 'delivery_partner') {
      throw createError('This account is not registered as a Delivery Partner', 403);
    }
    if (loginRole === 'customer' && user.role === 'delivery_partner') {
      throw createError('Please use the Delivery Partner tab to sign in', 403);
    }

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

const auth0Schema = z.object({
  accessToken: z.string(),
});

export async function auth0Auth(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken } = auth0Schema.parse(req.body);
    if (!accessToken) throw createError('Auth0 access token is required', 400);
    if (!env.AUTH0_DOMAIN) throw createError('Auth0 is not configured on this server', 503);

    const domain = env.AUTH0_DOMAIN.startsWith('http') ? env.AUTH0_DOMAIN : `https://${env.AUTH0_DOMAIN}`;
    const userinfoRes = await fetch(`${domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoRes.ok) {
      throw createError('Invalid Auth0 access token', 401);
    }

    const profile = await userinfoRes.json() as {
      sub: string;
      email: string;
      name?: string;
      nickname?: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!profile.email) {
      throw createError('Email is required from Auth0 profile', 400);
    }

    const auth0Id = profile.sub;
    const email = profile.email;
    const fullName = profile.name || profile.nickname || email.split('@')[0];
    const avatarUrl = profile.picture;
    const isVerified = !!profile.email_verified;

    let user = await User.findOne({ $or: [{ auth0Id }, { email }] });

    if (user) {
      if (!user.auth0Id) user.auth0Id = auth0Id;
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
      if (isVerified) user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        auth0Id,
        email,
        fullName,
        avatarUrl,
        isVerified,
      });
    }

    if (!user.isActive) throw createError('Account is deactivated', 403);

    const localAccessToken = generateAccessToken({ id: user.id, role: user.role });
    const localRefreshToken = generateRefreshToken({ id: user.id });
    user.refreshTokens.push(localRefreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();
    setRefreshCookie(res, localRefreshToken);

    res.json({
      success: true,
      data: {
        accessToken: localAccessToken,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    next(err);
  }
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6).max(72),
});

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      throw createError('No user found with that email address', 404);
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // Create reset URL
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em;">BLIPZO</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #4b5563; line-height: 24px; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to set a new password. This link is valid for 1 hour.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 16px;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #9ca3af; line-height: 20px;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          If you're having trouble clicking the button, copy and paste this URL into your web browser:<br />
          <a href="${resetUrl}" style="color: #d97706; text-decoration: underline;">${resetUrl}</a>
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'BLIPZO Password Reset Request',
      text: message,
      html,
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Hash token to compare with the one in DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw createError('Invalid or expired reset token', 400);
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (err) {
    next(err);
  }
}


