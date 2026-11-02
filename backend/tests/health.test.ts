import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Backend API Foundation Tests', () => {
  it('GET /health returns 200 and liveness status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health returns 200 and detailed diagnostics', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'ai-call-screening-backend');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('dependencies');
    expect(res.body.dependencies.database.status).toBe('not_configured');
    expect(res.body.dependencies.aiEngine.status).toBe('not_configured');
    expect(res.body.dependencies.telephony.status).toBe('not_configured');
  });

  it('attaches and propagates X-Request-Id header correctly', async () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(app)
      .get('/health')
      .set('X-Request-Id', testUuid);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(testUuid);
  });

  it('generates a new X-Request-Id if not provided', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
  });

  it('returns structured safe 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-for-testing');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not found');
    expect(res.body.error).toHaveProperty('timestamp');
    expect(res.body.error).toHaveProperty('requestId');
  });

  it('includes security headers from Helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
