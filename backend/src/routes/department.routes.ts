import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';

export const departmentRouter = Router();

const createDeptSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code max 10 characters'),
  description: z.string().optional(),
  primaryExtension: z.string().optional(),
  routingTimeoutSeconds: z.number().int().min(5).max(120).default(20),
  isActive: z.boolean().default(true),
});

const updateDeptSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(10).optional(),
  description: z.string().optional(),
  primaryExtension: z.string().optional(),
  routingTimeoutSeconds: z.number().int().min(5).max(120).optional(),
  isActive: z.boolean().optional(),
});

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments (Admins view all; staff/operators view active)
 * @access  Private (Authenticated)
 */
departmentRouter.get('/departments', authenticateUser, (req: Request, res: Response) => {
  const onlyActive = req.user?.role !== 'admin';
  const departments = dbStore.getDepartments(onlyActive);
  res.status(200).json(departments);
});

/**
 * @route   POST /api/v1/departments
 * @desc    Create a new department
 * @access  Private (Admin only)
 */
departmentRouter.post(
  '/departments',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const parseResult = createDeptSchema.safeParse(req.body);
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

    const { name, code, description, primaryExtension, routingTimeoutSeconds, isActive } =
      parseResult.data;

    // Check unique code constraint
    const existing = dbStore.getDepartmentByCode(code);
    if (existing) {
      res.status(409).json({
        error: {
          code: 'DUPLICATE_CODE',
          message: `Department with code '${code}' already exists.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const created = dbStore.createDepartment({
      name,
      code,
      description,
      primaryExtension,
      routingTimeoutSeconds,
      isActive,
    });

    dbStore.addAuditLog({
      userId: req.user?.id,
      action: 'DEPARTMENT_CREATED',
      entityType: 'department',
      entityId: created.id,
      details: { name, code },
      ipAddress: req.ip,
    });

    res.status(201).json(created);
  }
);

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get department by ID with associated staff extensions
 * @access  Private (Authenticated)
 */
departmentRouter.get('/departments/:id', authenticateUser, (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const dept = dbStore.getDepartmentById(id);
  if (!dept) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Department '${id}' was not found.`,
        requestId: req.id ? String(req.id) : undefined,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const extensions = dbStore.getStaffExtensionsByDepartment(dept.id);

  res.status(200).json({
    ...dept,
    extensions,
  });
});

/**
 * @route   PATCH /api/v1/departments/:id
 * @desc    Update department properties
 * @access  Private (Admin only)
 */
departmentRouter.patch(
  '/departments/:id',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateDeptSchema.safeParse(req.body);
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

    const updated = dbStore.updateDepartment(id, parseResult.data);
    if (!updated) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Department '${id}' was not found.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    dbStore.addAuditLog({
      userId: req.user?.id,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'department',
      entityId: updated.id,
      details: parseResult.data,
      ipAddress: req.ip,
    });

    res.status(200).json(updated);
  }
);
