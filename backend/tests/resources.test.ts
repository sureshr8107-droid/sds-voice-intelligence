import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dbStore } from '../src/database/store';

const app = createApp();

describe('Operational Resource APIs (Departments, Staff, Rules, Callbacks)', () => {
  beforeEach(() => {
    dbStore.resetToSeed();
  });

  describe('Department APIs', () => {
    it('GET /api/v1/departments returns active departments', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(5);
    });

    it('POST /api/v1/departments allows admin to create new department', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', 'Bearer mock-admin-token');

      const createRes = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          name: 'Hostel & Housing Office',
          code: 'HST',
          description: 'Hostel accommodation, mess fees, and room allotments.',
          primaryExtension: '106',
          routingTimeoutSeconds: 20,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Hostel & Housing Office');
      expect(createRes.body.code).toBe('HST');
    });

    it('POST /api/v1/departments forbids staff from creating department', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          name: 'Unauthorized Dept',
          code: 'UNA',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/departments rejects duplicate department code', async () => {
      // In seed, ADM already exists
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          name: 'Duplicate Admissions',
          code: 'ADM',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_CODE');
    });

    it('GET /api/v1/departments/:id returns department and extensions', async () => {
      const deptId = '11111111-1111-1111-1111-111111111001';
      const res = await request(app)
        .get(`/api/v1/departments/${deptId}`)
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(deptId);
      expect(res.body).toHaveProperty('extensions');
      expect(Array.isArray(res.body.extensions)).toBe(true);
    });

    it('PATCH /api/v1/departments/:id allows admin to update department', async () => {
      const deptId = '11111111-1111-1111-1111-111111111001';
      const res = await request(app)
        .patch(`/api/v1/departments/${deptId}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          routingTimeoutSeconds: 30,
        });

      expect(res.status).toBe(200);
      expect(res.body.routingTimeoutSeconds).toBe(30);
    });
  });

  describe('Staff APIs', () => {
    it('GET /api/v1/staff returns staff summaries', async () => {
      const res = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /api/v1/extensions returns all staff extensions', async () => {
      const res = await request(app)
        .get('/api/v1/extensions')
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(5);
    });

    it('PATCH /api/v1/staff/:id/availability allows staff to update their own status', async () => {
      // Extension 33333333-3333-3333-3333-333333333002 is assigned to mock-staff (Prof. Robert Miller)
      const extId = '33333333-3333-3333-3333-333333333002';
      const res = await request(app)
        .patch(`/api/v1/staff/${extId}/availability`)
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          status: 'busy',
          customStatusMessage: 'In admissions faculty meeting',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('busy');
      expect(res.body.customStatusMessage).toBe('In admissions faculty meeting');
    });

    it('PATCH /api/v1/staff/:id/availability forbids staff from modifying another staff member', async () => {
      // Extension 33333333-3333-3333-3333-333333333003 belongs to Clara Oswald
      // Prof. Robert Miller attempting to modify Clara must be rejected
      const extId = '33333333-3333-3333-3333-333333333003';
      const res = await request(app)
        .patch(`/api/v1/staff/${extId}/availability`)
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          status: 'offline',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PATCH /api/v1/staff/:id/availability allows admin to update any staff member', async () => {
      const extId = '33333333-3333-3333-3333-333333333003';
      const res = await request(app)
        .patch(`/api/v1/staff/${extId}/availability`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          status: 'available',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('available');
    });
  });

  describe('Routing Rules APIs', () => {
    it('GET /api/v1/routing-rules returns configured rules', async () => {
      const res = await request(app)
        .get('/api/v1/routing-rules')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);
    });

    it('POST /api/v1/routing-rules allows admin to create rule', async () => {
      const res = await request(app)
        .post('/api/v1/routing-rules')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          departmentId: '11111111-1111-1111-1111-111111111001',
          intentKeyword: 'scholarship',
          priority: 8,
          fallbackDestinationType: 'voicemail',
        });

      expect(res.status).toBe(201);
      expect(res.body.intentKeyword).toBe('scholarship');
      expect(res.body.priority).toBe(8);
    });

    it('PATCH /api/v1/routing-rules/:id allows admin to toggle active status', async () => {
      const ruleId = '66666666-6666-6666-6666-666666666001';
      const res = await request(app)
        .patch(`/api/v1/routing-rules/${ruleId}`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('DELETE /api/v1/routing-rules/:id allows admin to delete rule', async () => {
      const ruleId = '66666666-6666-6666-6666-666666666012';
      const res = await request(app)
        .delete(`/api/v1/routing-rules/${ruleId}`)
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });
  });

  describe('Callback APIs', () => {
    it('GET /api/v1/callbacks returns callback queue items', async () => {
      const res = await request(app)
        .get('/api/v1/callbacks')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('callbacks');
      expect(res.body.callbacks.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/v1/callbacks creates new callback request', async () => {
      const res = await request(app)
        .post('/api/v1/callbacks')
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          callerNumber: '+15557766',
          callerName: 'Manual Inquirer',
          notes: 'Caller requested follow-up regarding certificate verification',
          status: 'pending',
        });

      expect(res.status).toBe(201);
      expect(res.body.callerNumber).toBe('+15557766');
      expect(res.body.status).toBe('pending');
    });

    it('PATCH /api/v1/callbacks/:id updates callback status', async () => {
      const cbId = '77777777-7777-7777-7777-777777777001';
      const res = await request(app)
        .patch(`/api/v1/callbacks/${cbId}`)
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          status: 'completed',
          notes: 'Finance clerk verified payment receipt and emailed PDF to caller',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });
});
