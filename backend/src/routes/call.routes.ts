import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { dbStore } from '../database/store';
import { CallStateMachine, InvalidStateTransitionError, CallStateConcurrencyError } from '../services/callStateMachine';
import { CallStatus } from '@call-screening/shared';

export const callRouter = Router();

// Zod schema for call status updates
const updateCallStatusSchema = z.object({
  status: z.enum([
    'initiated',
    'ringing',
    'answered_by_ai',
    'processing',
    'awaiting_staff',
    'connecting',
    'bridged',
    'completed',
    'rejected',
    'timed_out',
    'failed',
    'callback_requested',
  ]),
  reason: z.string().optional(),
  assignedStaffId: z.string().uuid().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  aiSummary: z.string().optional(),
});

/**
 * @route   GET /api/v1/calls
 * @desc    Get paginated, filtered call history with RBAC data scoping
 * @access  Private (Authenticated)
 */
callRouter.get('/calls', authenticateUser, (req: Request, res: Response) => {
  const user = req.user!;
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
  const status = req.query.status ? (String(req.query.status) as CallStatus) : undefined;
  const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Role-based data scoping: Staff can only view calls from their department or assigned to them
  let userDepartmentId: string | undefined;
  let assignedStaffId: string | undefined;

  if (user.role === 'staff') {
    const staffExt = dbStore.getStaffExtensionByProfileId(user.id);
    if (staffExt) {
      userDepartmentId = staffExt.departmentId;
      assignedStaffId = staffExt.id;
    }
  }

  const result = dbStore.getCalls({
    page,
    limit,
    status,
    departmentId,
    search,
    sortBy,
    sortOrder,
    userDepartmentId,
    assignedStaffId,
  });

  res.status(200).json(result);
});

/**
 * @route   GET /api/v1/calls/stats
 * @desc    Get aggregate call metrics based on actual records
 * @access  Private (Authenticated)
 */
callRouter.get('/calls/stats', authenticateUser, (_req: Request, res: Response) => {
  const stats = dbStore.getCallStats();
  res.status(200).json(stats);
});

/**
 * @route   GET /api/v1/calls/:id
 * @desc    Get call record by ID including transcripts and audit details with IDOR protection
 * @access  Private (Authenticated)
 */
callRouter.get('/calls/:id', authenticateUser, (req: Request, res: Response) => {
  const user = req.user!;
  const callId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const call = dbStore.getCallById(callId);
  if (!call) {
    res.status(404).json({
      error: {
        code: 'CALL_NOT_FOUND',
        message: `Call record '${callId}' was not found.`,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // IDOR Protection: Staff role cannot inspect calls outside their assigned department
  if (user.role === 'staff') {
    const staffExt = dbStore.getStaffExtensionByProfileId(user.id);
    if (staffExt) {
      const isAssigned = call.assignedStaffId === staffExt.id;
      const isDeptCall = call.departmentId === staffExt.departmentId;
      if (!isAssigned && !isDeptCall) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: You can only view calls assigned to your department.',
            requestId: req.id ? String(req.id) : undefined,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }
  }

  // Attach associated transcripts
  const transcripts = dbStore.getCallTranscripts(callId);

  res.status(200).json({
    ...call,
    transcripts,
  });
});

/**
 * @route   PATCH /api/v1/calls/:id/status
 * @desc    Update call status via Call Finite State Machine
 * @access  Private (Authenticated)
 */
callRouter.patch('/calls/:id/status', authenticateUser, async (req: Request, res: Response) => {
  const callId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const parseResult = updateCallStatusSchema.safeParse(req.body);
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

  const { status, reason, assignedStaffId, durationSeconds, aiSummary } = parseResult.data;

  try {
    const updatedCall = await CallStateMachine.transition(callId, status, {
      reason,
      assignedStaffId,
      durationSeconds,
      aiSummary,
      userId: req.user?.id,
      ipAddress: req.ip,
    });

    res.status(200).json(updatedCall);
  } catch (error: any) {
    if (error instanceof InvalidStateTransitionError) {
      res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          currentStatus: error.currentStatus,
          targetStatus: error.targetStatus,
          permittedTransitions: error.permittedTransitions,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (error instanceof CallStateConcurrencyError) {
      res.status(409).json({
        error: {
          code: error.code,
          message: error.message,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (error.code === 'CALL_NOT_FOUND' || error.statusCode === 404) {
      res.status(404).json({
        error: {
          code: 'CALL_NOT_FOUND',
          message: error.message,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'STATE_TRANSITION_ERROR',
        message: error.message || 'An error occurred during state transition.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }
});
