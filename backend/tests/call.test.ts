import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dbStore } from '../src/database/store';

const app = createApp();

describe('Call Management APIs (Phase 5)', () => {
  beforeEach(() => {
    dbStore.resetToSeed();
  });

  describe('GET /api/v1/calls', () => {
    it('returns paginated call history for admin', async () => {
      const res = await request(app)
        .get('/api/v1/calls?page=1&limit=2')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('calls');
      expect(res.body).toHaveProperty('total');
      expect(res.body.calls.length).toBeLessThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(4);
    });

    it('filters calls by status', async () => {
      const res = await request(app)
        .get('/api/v1/calls?status=completed')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.calls.every((c: any) => c.status === 'completed')).toBe(true);
    });

    it('filters calls by departmentId', async () => {
      const deptId = '11111111-1111-1111-1111-111111111001';
      const res = await request(app)
        .get(`/api/v1/calls?departmentId=${deptId}`)
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.calls.every((c: any) => c.departmentId === deptId)).toBe(true);
    });

    it('searches calls by phone number or intent', async () => {
      const res = await request(app)
        .get('/api/v1/calls?search=admissions')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('enforces RBAC data scoping: staff only sees calls from their department', async () => {
      // Prof. Robert Miller is in Admissions department (11111111-1111-1111-1111-111111111001)
      const res = await request(app)
        .get('/api/v1/calls')
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(200);
      const calls = res.body.calls;
      for (const call of calls) {
        const isMyDept = call.departmentId === '11111111-1111-1111-1111-111111111001';
        const isAssigned = call.assignedStaffId === '33333333-3333-3333-3333-333333333002';
        expect(isMyDept || isAssigned).toBe(true);
      }
    });
  });

  describe('GET /api/v1/calls/stats', () => {
    it('returns accurate aggregate operational metrics based on real database records', async () => {
      const res = await request(app)
        .get('/api/v1/calls/stats')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalCalls');
      expect(res.body).toHaveProperty('inProgressCalls');
      expect(res.body).toHaveProperty('completedCalls');
      expect(res.body).toHaveProperty('missedCalls');
      expect(res.body).toHaveProperty('pendingCallbacks');
      expect(res.body).toHaveProperty('avgDurationSeconds');
      expect(res.body.totalCalls).toBeGreaterThanOrEqual(4);
    });
  });

  describe('GET /api/v1/calls/:id', () => {
    it('returns complete call details with attached transcripts', async () => {
      const callId = '55555555-5555-5555-5555-555555555001';
      const res = await request(app)
        .get(`/api/v1/calls/${callId}`)
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(callId);
      expect(res.body.callerNumber).toBe('+15550199');
      expect(res.body).toHaveProperty('transcripts');
      expect(res.body.transcripts.length).toBeGreaterThanOrEqual(3);
    });

    it('returns 404 for non-existent call record', async () => {
      const res = await request(app)
        .get('/api/v1/calls/00000000-0000-0000-0000-000000000999')
        .set('Authorization', 'Bearer mock-admin-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CALL_NOT_FOUND');
    });

    it('prevents IDOR: forbids staff from accessing calls outside their department', async () => {
      // Call 55555555-5555-5555-5555-555555555004 belongs to Technical Support (11111111-1111-1111-1111-111111111004)
      // Prof. Robert Miller is in Admissions (11111111-1111-1111-1111-111111111001)
      const foreignCallId = '55555555-5555-5555-5555-555555555004';
      const res = await request(app)
        .get(`/api/v1/calls/${foreignCallId}`)
        .set('Authorization', 'Bearer mock-staff-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/v1/calls/:id/status', () => {
    it('executes valid state machine transition (awaiting_staff -> bridged)', async () => {
      // Seed call 55555555-5555-5555-5555-555555555002 is in 'awaiting_staff' status
      const callId = '55555555-5555-5555-5555-555555555002';
      const res = await request(app)
        .patch(`/api/v1/calls/${callId}/status`)
        .set('Authorization', 'Bearer mock-staff-token')
        .send({
          status: 'bridged',
          reason: 'Staff accepted call screening alert',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('bridged');
      expect(res.body.reason).toBe('Staff accepted call screening alert');
    });

    it('rejects invalid state transition with 400 Bad Request and permitted transition list', async () => {
      // Call 55555555-5555-5555-5555-555555555001 is already completed.
      // Transition from completed -> answered_by_ai is invalid.
      const callId = '55555555-5555-5555-5555-555555555001';
      const res = await request(app)
        .patch(`/api/v1/calls/${callId}/status`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          status: 'answered_by_ai',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
      expect(res.body.error.permittedTransitions).toBeDefined();
    });

    it('returns 404 when updating non-existent call record', async () => {
      const res = await request(app)
        .patch('/api/v1/calls/00000000-0000-0000-0000-000000000999/status')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          status: 'answered_by_ai',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CALL_NOT_FOUND');
    });
  });
});
