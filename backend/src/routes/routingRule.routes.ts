import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';

export const routingRuleRouter = Router();

const createRuleSchema = z.object({
  departmentId: z.string().uuid('departmentId must be a valid UUID'),
  intentKeyword: z.string().min(2, 'intentKeyword must be at least 2 characters'),
  priority: z.number().int().min(1).max(100).default(10),
  fallbackDestinationType: z
    .enum(['operator', 'voicemail', 'extension', 'external_number'])
    .default('voicemail'),
  fallbackDestinationValue: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateRuleSchema = z.object({
  departmentId: z.string().uuid().optional(),
  intentKeyword: z.string().min(2).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  fallbackDestinationType: z.enum(['operator', 'voicemail', 'extension', 'external_number']).optional(),
  fallbackDestinationValue: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * @route   GET /api/v1/routing-rules
 * @desc    Get all routing rules
 * @access  Private (Authenticated)
 */
routingRuleRouter.get('/routing-rules', authenticateUser, (req: Request, res: Response) => {
  const onlyActive = req.user?.role !== 'admin' && req.user?.role !== 'operator';
  const rules = dbStore.getRoutingRules(onlyActive);
  res.status(200).json(rules);
});

/**
 * @route   POST /api/v1/routing-rules
 * @desc    Create a new intelligent routing rule
 * @access  Private (Admin only)
 */
routingRuleRouter.post(
  '/routing-rules',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const parseResult = createRuleSchema.safeParse(req.body);
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

    const {
      departmentId,
      intentKeyword,
      priority,
      fallbackDestinationType,
      fallbackDestinationValue,
      isActive,
    } = parseResult.data;

    // Verify department exists
    const dept = dbStore.getDepartmentById(departmentId);
    if (!dept) {
      res.status(404).json({
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: `Department '${departmentId}' does not exist.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const created = dbStore.createRoutingRule({
      departmentId,
      intentKeyword,
      priority,
      fallbackDestinationType,
      fallbackDestinationValue,
      isActive,
    });

    dbStore.addAuditLog({
      userId: req.user?.id,
      action: 'ROUTING_RULE_CREATED',
      entityType: 'routing_rule',
      entityId: created.id,
      details: { intentKeyword, departmentId, priority },
      ipAddress: req.ip,
    });

    res.status(201).json(created);
  }
);

/**
 * @route   PATCH /api/v1/routing-rules/:id
 * @desc    Update a routing rule or toggle active state
 * @access  Private (Admin only)
 */
routingRuleRouter.patch(
  '/routing-rules/:id',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateRuleSchema.safeParse(req.body);
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

    if (parseResult.data.departmentId) {
      const dept = dbStore.getDepartmentById(parseResult.data.departmentId);
      if (!dept) {
        res.status(404).json({
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: `Department '${parseResult.data.departmentId}' does not exist.`,
            requestId: req.id ? String(req.id) : undefined,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    const updated = dbStore.updateRoutingRule(id, parseResult.data);
    if (!updated) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Routing rule '${id}' was not found.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    dbStore.addAuditLog({
      userId: req.user?.id,
      action: 'ROUTING_RULE_UPDATED',
      entityType: 'routing_rule',
      entityId: updated.id,
      details: parseResult.data,
      ipAddress: req.ip,
    });

    res.status(200).json(updated);
  }
);

/**
 * @route   DELETE /api/v1/routing-rules/:id
 * @desc    Delete a routing rule
 * @access  Private (Admin only)
 */
routingRuleRouter.delete(
  '/routing-rules/:id',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = dbStore.deleteRoutingRule(id);
    if (!deleted) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Routing rule '${id}' was not found.`,
          requestId: req.id ? String(req.id) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    dbStore.addAuditLog({
      userId: req.user?.id,
      action: 'ROUTING_RULE_DELETED',
      entityType: 'routing_rule',
      entityId: id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: `Routing rule '${id}' deleted successfully.`,
      timestamp: new Date().toISOString(),
    });
  }
);
