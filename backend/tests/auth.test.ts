import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dbStore } from '../src/database/store';
import { clearBlacklist } from '../src/utils/security';
import { env } from '../src/config/env';

const app = createApp();

describe('Authentication & Authorization Suite (Phase 5)', () => {
  beforeEach(() => {
    dbStore.resetToSeed();
    clearBlacklist();
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid admin credentials and returns JWT token and profile', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@institution.local',
        password: 'Admin@123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.email).toBe('admin@institution.local');
      expect(res.body.user.fullName).toBe('Dr. Alice Sharma');
      expect(res.body.expiresIn).toBe('24h');
    });

    it('authenticates valid staff credentials and returns staff profile', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'staff@institution.local',
        password: 'Staff@123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('staff');
      expect(res.body.user.email).toBe('staff@institution.local');
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@institution.local',
        password: 'WrongPassword999',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toContain('Invalid email or password');
    });

    it('rejects non-existent email with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@institution.local',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects malformed email format with 400 Bad Request', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout & Token Invalidation', () => {
    it('revokes the active token and blocks subsequent requests', async () => {
      // 1. Log in to get real token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@institution.local',
        password: 'Admin@123',
      });
      const token = loginRes.body.token;

      // 2. Verify token works on /auth/me
      const meResBefore = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResBefore.status).toBe(200);

      // 3. Log out
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('Successfully logged out');

      // 4. Try using the revoked token on /auth/me
      const meResAfter = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResAfter.status).toBe(401);
      expect(meResAfter.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('rejects unauthenticated logout attempt with 401', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Missing or malformed Authorization header');
    });

    it('rejects malformed token format with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic invalid-format');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('authenticates real signed JWT and returns user profile', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'staff@institution.local',
        password: 'Staff@123',
      });
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.role).toBe('staff');
      expect(res.body.user.email).toBe('staff@institution.local');
    });

    it('rejects invalid or tampered JWT token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Production Mock Token Rejection', () => {
    it('strictly forbids mock tokens when NODE_ENV is production', async () => {
      const originalEnv = env.NODE_ENV;
      try {
        (env as any).NODE_ENV = 'production';

        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer mock-admin-token');

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('MOCK_TOKENS_FORBIDDEN');
      } finally {
        (env as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('RBAC & Role Enforcement', () => {
    it('permits admin to access admin-only endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin/test')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Admin authorization granted');
    });

    it('forbids staff from accessing admin-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin/test')
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain("Requires one of roles: [admin]. Current role: 'staff'");
    });

    it('permits both staff and operator to access staff endpoint', async () => {
      // Staff access
      const staffRes = await request(app)
        .get('/api/v1/auth/staff/test')
        .set('Authorization', 'Bearer mock-staff-token');
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.role).toBe('staff');

      // Operator access
      const operatorRes = await request(app)
        .get('/api/v1/auth/staff/test')
        .set('Authorization', 'Bearer mock-operator-token');
      expect(operatorRes.status).toBe(200);
      expect(operatorRes.body.role).toBe('operator');
    });
  });
});
