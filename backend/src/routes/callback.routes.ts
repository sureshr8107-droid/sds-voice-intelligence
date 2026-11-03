import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { dbStore } from '../database/store';
import { emitCallbackCreated } from '../socket';

export const callbackRouter = Router();

const createCallbackSchema = z.object({
  callId: z.string().uuid().optional(),
  callerNumber: z.string().min(5, 'Caller number must be at least 5 digits'),
  callerName: z.string().optional(),
  requestedDepartmentId: z.string().uuid().optional(),
  preferredCallbackTime: z.string().optional(),
  transcriptSummary: z.string().optional(),
  audioRecordingUrl: z.string().url().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).default('pending'),
});

const updateCallbackSchema = z.object({
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  assignedProfileId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * @route   GET /api/v1/callbacks
 * @desc    Get paginated callback queue with department filtering
 * @access  Private (Authenticated)
 */
callbackRouter.get('/callbacks', authenticateUser, (req: Request, res: Response) => {
  const user = req.user!;
  const status = req.query.status ? String(req.query.status) : undefined;
  let departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

  // Scoping: If user is staff, scope to their department unless admin/operator
  if (user.role === 'staff') {
    const ext = dbStore.getStaffExtensionByProfileId(user.id);
    if (ext) {
      departmentId = ext.departmentId;
    }
  }

  const result = dbStore.getCallbacks({ status, departmentId, page, limit });
  res.status(200).json(result);
});

/**
 * @route   POST /api/v1/callbacks
 * @desc    Create a new callback / voicemail queue item
 * @access  Private (Authenticated)
 */
callbackRouter.post('/callbacks', authenticateUser, (req: Request, res: Response) => {
  const parseResult = createCallbackSchema.safeParse(req.body);
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

  const created = dbStore.createCallback(parseResult.data);

  dbStore.addAuditLog({
    userId: req.user?.id,
    action: 'CALLBACK_CREATED',
    entityType: 'callback_request',
    entityId: created.id,
    details: { callerNumber: created.callerNumber, requestedDepartmentId: created.requestedDepartmentId },
    ipAddress: req.ip,
  });

  try {
    emitCallbackCreated(created);
  } catch (err) {
    // Non-blocking socket error
  }

  res.status(201).json(created);
});

/**
 * @route   PATCH /api/v1/callbacks/:id
 * @desc    Update callback item status, notes, or assigned staff profile
 * @access  Private (Authenticated)
 */
callbackRouter.patch('/callbacks/:id', authenticateUser, (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parseResult = updateCallbackSchema.safeParse(req.body);
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

  const updated = dbStore.updateCallback(id, parseResult.data);
  if (!updated) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Callback request '${id}' was not found.`,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  dbStore.addAuditLog({
    userId: req.user?.id,
    action: 'CALLBACK_UPDATED',
    entityType: 'callback_request',
    entityId: updated.id,
    details: parseResult.data,
    ipAddress: req.ip,
  });

  res.status(200).json(updated);
});
