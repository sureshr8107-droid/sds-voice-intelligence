import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { dbStore } from '../database/store';
import { emitStaffAvailabilityChanged } from '../socket';

export const staffRouter = Router();

const updateAvailabilitySchema = z.object({
  status: z.enum(['available', 'busy', 'away', 'do_not_disturb', 'offline']),
  customStatusMessage: z.string().optional(),
});

/**
 * @route   GET /api/v1/staff
 * @desc    Get list of all staff members with availability and extensions
 * @access  Private (Authenticated)
 */
staffRouter.get('/staff', authenticateUser, (_req: Request, res: Response) => {
  const staff = dbStore.getStaffMembers();
  res.status(200).json(staff);
});

/**
 * @route   GET /api/v1/extensions
 * @desc    Get all staff extensions
 * @access  Private (Authenticated)
 */
staffRouter.get('/extensions', authenticateUser, (_req: Request, res: Response) => {
  const extensions = dbStore.getAllStaffExtensions();
  res.status(200).json(extensions);
});

/**
 * @route   GET /api/v1/staff/:id
 * @desc    Get single staff member extension and profile details
 * @access  Private (Authenticated)
 */
staffRouter.get('/staff/:id', authenticateUser, (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ext = dbStore.getStaffExtensionById(id);
  if (!ext) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Staff extension '${id}' was not found.`,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const profile = dbStore.getProfileById(ext.profileId);
  const dept = dbStore.getDepartmentById(ext.departmentId);
  const avail = dbStore.getStaffAvailability(ext.id);

  res.status(200).json({
    extension: ext,
    profile,
    department: dept,
    availability: avail,
  });
});

/**
 * @route   PATCH /api/v1/staff/:id/availability
 * @desc    Update staff availability status with role-based ownership validation
 * @access  Private (Authenticated)
 */
staffRouter.patch('/staff/:id/availability', authenticateUser, (req: Request, res: Response) => {
  const staffExtensionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const ext = dbStore.getStaffExtensionById(staffExtensionId);
  if (!ext) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Staff extension '${staffExtensionId}' was not found.`,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Enforce role permissions: Staff can only update their own availability. Admins and Operators can update any.
  if (user.role === 'staff' && ext.profileId !== user.id) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Permission denied: Staff members can only update their own availability.',
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const parseResult = updateAvailabilitySchema.safeParse(req.body);
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

  const { status, customStatusMessage } = parseResult.data;

  const updatedAvail = dbStore.updateStaffAvailability(staffExtensionId, status, customStatusMessage);

  dbStore.addAuditLog({
    userId: user.id,
    action: 'STAFF_AVAILABILITY_CHANGED',
    entityType: 'staff_availability',
    entityId: staffExtensionId,
    details: { status, customStatusMessage },
    ipAddress: req.ip,
  });

  try {
    emitStaffAvailabilityChanged(staffExtensionId, ext.profileId, status, customStatusMessage);
  } catch (err) {
    // Non-blocking socket emission error
  }

  res.status(200).json(updatedAvail);
});
