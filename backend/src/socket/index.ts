import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  AuthenticatedUser,
  CallRecord,
  CallStatus,
  AvailabilityStatus,
  CallbackRequest,
  CallCreatedEvent,
  CallUpdatedEvent,
  CallStatusChangedEvent,
  CallRoutingUpdatedEvent,
  StaffAvailabilityChangedEvent,
  CallbackCreatedEvent,
} from '@call-screening/shared';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { verifyJwtToken } from '../utils/security';
import { dbStore } from '../database/store';

let ioInstance: Server | null = null;

// Mock users mapping for development and test socket handshakes
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
 * Initialize Socket.IO server with authentication middleware and room segregation
 */
export function initSocketServer(httpServer: HttpServer): Server {
  const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((o) => o.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Authentication Middleware for incoming socket handshakes
  io.use((socket: Socket, next) => {
    const rawToken =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers['authorization'] as string);

    if (!rawToken) {
      return next(new Error('Authentication error: Missing token'));
    }

    const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;

    // 1. Strict production mock token rejection
    if (env.NODE_ENV === 'production' && token.startsWith('mock-')) {
      return next(new Error('Authentication error: Mock tokens strictly forbidden in production'));
    }

    // 2. Development/Test mock token support
    if (env.NODE_ENV !== 'production' && MOCK_USERS[token]) {
      socket.data.user = MOCK_USERS[token];
      return next();
    }

    // 3. JWT verification
    const verifiedUser = verifyJwtToken(token);
    if (!verifiedUser) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    socket.data.user = verifiedUser;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user: AuthenticatedUser = socket.data.user;
    logger.info({ socketId: socket.id, userId: user?.id, role: user?.role }, 'Socket client connected');

    if (user) {
      // Join personal user room
      socket.join(`user:${user.id}`);

      // Join role room
      socket.join(`role:${user.role}`);

      // If user is staff, join their department room
      const staffExt = dbStore.getStaffExtensionByProfileId(user.id);
      if (staffExt) {
        socket.join(`dept:${staffExt.departmentId}`);
        socket.join(`extension:${staffExt.extension}`);
      }
    }

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId: user?.id, reason }, 'Socket client disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ socketId: socket.id, err }, 'Socket client error occurred');
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Access the initialized Socket.IO server
 */
export function getSocketServer(): Server | null {
  return ioInstance;
}

// -----------------------------------------------------------------------------
// Real-time Event Broadcasters (Filtered by Role & Department)
// -----------------------------------------------------------------------------

/**
 * Broadcast when a new call record is created
 */
export function emitCallCreated(call: CallRecord): void {
  if (!ioInstance) return;

  const payload: CallCreatedEvent = {
    call,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to Admins, Operators, and Department Staff
  ioInstance.to('role:admin').to('role:operator').emit('call:created', payload);

  if (call.departmentId) {
    ioInstance.to(`dept:${call.departmentId}`).emit('call:created', payload);
  }
}

/**
 * Broadcast when an existing call record is updated
 */
export function emitCallUpdated(call: CallRecord): void {
  if (!ioInstance) return;

  const payload: CallUpdatedEvent = {
    call,
    timestamp: new Date().toISOString(),
  };

  ioInstance.to('role:admin').to('role:operator').emit('call:updated', payload);

  if (call.departmentId) {
    ioInstance.to(`dept:${call.departmentId}`).emit('call:updated', payload);
  }
}

/**
 * Broadcast when a call state machine transition occurs
 */
export function emitCallStatusChanged(
  callId: string,
  previousStatus: CallStatus,
  currentStatus: CallStatus,
  reason?: string
): void {
  if (!ioInstance) return;

  const payload: CallStatusChangedEvent = {
    callId,
    previousStatus,
    currentStatus,
    reason,
    timestamp: new Date().toISOString(),
  };

  ioInstance.to('role:admin').to('role:operator').emit('call:status_changed', payload);

  const call = dbStore.getCallById(callId);
  if (call?.departmentId) {
    ioInstance.to(`dept:${call.departmentId}`).emit('call:status_changed', payload);
  }
}

/**
 * Broadcast when intelligent routing updates a call's target destination
 */
export function emitCallRoutingUpdated(
  callId: string,
  details: {
    departmentId?: string;
    assignedStaffId?: string;
    ruleId?: string;
    intent?: string;
    fallback?: boolean;
  }
): void {
  if (!ioInstance) return;

  const payload: CallRoutingUpdatedEvent = {
    callId,
    ...details,
    timestamp: new Date().toISOString(),
  };

  ioInstance.to('role:admin').to('role:operator').emit('call:routing_updated', payload);

  if (details.departmentId) {
    ioInstance.to(`dept:${details.departmentId}`).emit('call:routing_updated', payload);
  }
}

/**
 * Broadcast when staff member's availability status changes
 */
export function emitStaffAvailabilityChanged(
  staffExtensionId: string,
  profileId: string,
  status: AvailabilityStatus,
  customStatusMessage?: string
): void {
  if (!ioInstance) return;

  const payload: StaffAvailabilityChangedEvent = {
    staffExtensionId,
    profileId,
    status,
    customStatusMessage,
    timestamp: new Date().toISOString(),
  };

  // Availability changes are visible across all authenticated staff, admins, and operators
  ioInstance.emit('staff:availability_changed', payload);
}

/**
 * Broadcast when a new callback / voicemail request is generated
 */
export function emitCallbackCreated(callback: CallbackRequest): void {
  if (!ioInstance) return;

  const payload: CallbackCreatedEvent = {
    callback,
    timestamp: new Date().toISOString(),
  };

  ioInstance.to('role:admin').to('role:operator').emit('callback:created', payload);

  if (callback.requestedDepartmentId) {
    ioInstance.to(`dept:${callback.requestedDepartmentId}`).emit('callback:created', payload);
  }
}
