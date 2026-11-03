import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser } from '@call-screening/shared';

/**
 * In-memory blacklist for invalidated JWT tokens (session revocation)
 */
const tokenBlacklist = new Set<string>();

/**
 * Hash a plain-text password using PBKDF2 (SHA-512)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Securely verify a password against a salt:hash string using constant-time comparison
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Generate a signed JWT token for an authenticated user
 */
export function generateToken(user: AuthenticatedUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phoneNumber: user.phoneNumber,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
    issuer: 'sds-voice-intelligence',
    audience: 'sds-voice-console',
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyJwtToken(token: string): AuthenticatedUser | null {
  if (isTokenBlacklisted(token)) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'sds-voice-intelligence',
      audience: 'sds-voice-console',
    }) as any;

    return {
      id: decoded.sub,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Invalidate a token by adding it to the blacklist
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Check if a token has been blacklisted / revoked
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Clear the blacklist (primarily for test resets)
 */
export function clearBlacklist(): void {
  tokenBlacklist.clear();
}
