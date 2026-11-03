import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticateUser, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
import { generateToken, verifyPassword, blacklistToken } from '../utils/security';
import { logger } from '../utils/logger';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

export const authRouter = Router();

// Strict login rate limiter to prevent credential brute forcing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 attempts per IP window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      timestamp: new Date().toISOString(),
    },
  },
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate with email and password, issuing a signed JWT
 * @access  Public
 */
authRouter.post('/auth/login', loginLimiter, async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors.map((e) => e.message).join(', '),
        details: parseResult.error.errors,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const { email, password } = parseResult.data;

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user && data.session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, phone_number, avatar_url')
            .eq('id', data.user.id)
            .single();

          const authUser = {
            id: profile?.id || data.user.id,
            email: profile?.email || data.user.email || email,
            fullName: profile?.full_name || 'User',
            role: (profile?.role || 'staff') as any,
            phoneNumber: profile?.phone_number || undefined,
            avatarUrl: profile?.avatar_url || undefined,
          };

          const token = data.session.access_token || generateToken(authUser);

          dbStore.addAuditLog({
            userId: authUser.id,
            action: 'AUTH_LOGIN_SUCCESS',
            entityType: 'user',
            entityId: authUser.id,
            ipAddress: req.ip,
          });

          res.status(200).json({
            token,
            user: authUser,
            expiresIn: '24h',
          });
          return;
        }
      } catch (err) {
        logger.error({ err }, 'Supabase login error fallback to local credentials');
      }
    }
  }

  // 2. Validate against verified local store credentials
  const credential = dbStore.getCredentialByEmail(email);
  if (!credential) {
    logger.warn({ email, ip: req.ip }, 'Login failed: email not found');
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const isPasswordValid = verifyPassword(password, credential.passwordHash);
  if (!isPasswordValid) {
    logger.warn({ email, ip: req.ip }, 'Login failed: incorrect password');
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 3. Issue signed JWT token
  const authUser = {
    id: credential.profile.id,
    email: credential.profile.email,
    fullName: credential.profile.fullName,
    role: credential.profile.role,
    phoneNumber: credential.profile.phoneNumber,
    avatarUrl: credential.profile.avatarUrl,
  };

  const token = generateToken(authUser);

  // 4. Audit log login event
  dbStore.addAuditLog({
    userId: authUser.id,
    action: 'AUTH_LOGIN_SUCCESS',
    entityType: 'user',
    entityId: authUser.id,
    details: { email: authUser.email, role: authUser.role },
    ipAddress: req.ip,
  });

  logger.info({ userId: authUser.id, email: authUser.email, role: authUser.role }, 'User authenticated successfully');

  res.status(200).json({
    token,
    user: authUser,
    expiresIn: '24h',
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate current token / terminate session
 * @access  Private (Authenticated)
 */
authRouter.post('/auth/logout', authenticateUser, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    blacklistToken(token);
  }

  if (req.user) {
    dbStore.addAuditLog({
      userId: req.user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'user',
      entityId: req.user.id,
      ipAddress: req.ip,
    });
    logger.info({ userId: req.user.id }, 'User session terminated / token blacklisted');
  }

  res.status(200).json({
    message: 'Successfully logged out and session revoked.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Authenticated)
 */
authRouter.get('/auth/me', authenticateUser, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Test endpoints for RBAC verification
 */
authRouter.get('/auth/admin/test', authenticateUser, requireRole('admin'), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Admin authorization granted.',
    admin: req.user?.fullName,
    timestamp: new Date().toISOString(),
  });
});

authRouter.get(
  '/auth/staff/test',
  authenticateUser,
  requireRole('admin', 'staff', 'operator'),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Staff authorization granted.',
      staff: req.user?.fullName,
      role: req.user?.role,
      timestamp: new Date().toISOString(),
    });
  }
);
