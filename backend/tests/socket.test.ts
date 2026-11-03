import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketServer, getSocketServer } from '../src/socket';
import { generateToken } from '../src/utils/security';

describe('Socket.IO Real-Time Infrastructure (Phase 5)', () => {
  let httpServer: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    const app = createApp();
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        const addr = httpServer.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    const io = getSocketServer();
    if (io) {
      io.close();
    }
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('authenticates client handshake using valid signed JWT', async () => {
    const validToken = generateToken({
      id: '22222222-2222-2222-2222-222222222001',
      email: 'admin@institution.local',
      fullName: 'Dr. Alice Sharma',
      role: 'admin',
    });

    const client: ClientSocket = Client(`http://127.0.0.1:${serverPort}`, {
      auth: { token: validToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on('connect_error', (err) => {
        reject(err);
      });
    });
  });

  it('authenticates client handshake using dev mock token in non-production mode', async () => {
    const client: ClientSocket = Client(`http://127.0.0.1:${serverPort}`, {
      auth: { token: 'mock-staff-token' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on('connect_error', (err) => {
        reject(err);
      });
    });
  });

  it('rejects connection handshake when token is missing', async () => {
    const client: ClientSocket = Client(`http://127.0.0.1:${serverPort}`, {
      auth: {},
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      client.on('connect_error', (err) => {
        expect(err.message).toContain('Missing token');
        client.disconnect();
        resolve();
      });
    });
  });

  it('rejects connection handshake with invalid token', async () => {
    const client: ClientSocket = Client(`http://127.0.0.1:${serverPort}`, {
      auth: { token: 'invalid.token.string' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      client.on('connect_error', (err) => {
        expect(err.message).toContain('Invalid or expired token');
        client.disconnect();
        resolve();
      });
    });
  });
});
