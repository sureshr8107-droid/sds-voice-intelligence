import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser, UserRole, ApiErrorResponse } from '@call-screening/shared';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Development and test mock tokens for deterministic offline verification
const MOCK_USERS: Record<string, AuthenticatedUser> = {
  'mock-admin-token': {
    id: '22222222-2222-2222-2222-222222222001',
    email: 'admin@institution.local',
    fullName: 'Dr. Alice Sharma',
    role: 'admin',
    phoneNumber: '+15550101',
  },
  'mock-staff-token': {
    id: '22222222-2222-2222-2222-222222222002',
    email: 'staff@institution.local',
    fullName: 'Prof. Robert Miller',
    role: 'staff',
    phoneNumber: '+15550102',
  },
  'mock-operator-token': {
    id: '22222222-2222-2222-2222-222222222005',
    email: 'operator@institution.local',
    fullName: 'Sarah Connor',
    role: 'operator',
    phoneNumber: '+15550105',
  },
};

/**
 * Middleware: Verify Supabase JWT token and attach AuthenticatedUser to Request
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  const token = authHeader.split(' ')[1];

  // 1. Support offline/test mock tokens in test or development environments
  if ((env.NODE_ENV === 'test' || env.NODE_ENV === 'development') && MOCK_USERS[token]) {
    req.user = MOCK_USERS[token];
    next();
    return;
  }

  // 2. Check if Supabase client is configured
  if (!isSupabaseConfigured()) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Authentication service is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(503).json(errorResponse);
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(503).json({
      error: {
        code: 'AUTH_CLIENT_ERROR',
        message: 'Supabase client failed to initialize.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    // 3. Verify JWT with Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      logger.warn({ err: authError?.message }, 'Failed to verify Supabase JWT token');
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'The provided authentication token is invalid or expired.',
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 4. Fetch user's profile and assigned role from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, phone_number, avatar_url')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      // Fallback: If profile row not yet created, use auth metadata
      req.user = {
        id: userData.user.id,
        email: userData.user.email || '',
        fullName: userData.user.user_metadata?.full_name || userData.user.email || 'User',
        role: (userData.user.user_metadata?.role as UserRole) || 'staff',
      };
    } else {
      req.user = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as UserRole,
        phoneNumber: profile.phone_number || undefined,
        avatarUrl: profile.avatar_url || undefined,
      };
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Unexpected error during JWT verification');
    res.status(500).json({
      error: {
        code: 'AUTH_VERIFICATION_ERROR',
        message: 'An unexpected error occurred while verifying credentials.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Middleware Factory: Enforce Role-Based Access Control (RBAC)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User must be authenticated before accessing this resource.',
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}
