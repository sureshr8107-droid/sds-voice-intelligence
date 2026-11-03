import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Authentication & RBAC Middleware Tests', () => {
  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
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

  it('authenticates valid admin token and returns user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer mock-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.email).toBe('admin@institution.local');
    expect(res.body.user.fullName).toBe('Dr. Alice Sharma');
  });

  it('authenticates valid staff token and returns staff profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer mock-staff-token');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('staff');
    expect(res.body.user.email).toBe('staff@institution.local');
    expect(res.body.user.fullName).toBe('Prof. Robert Miller');
  });

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
    expect(res.body).toHaveProperty('error');
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
