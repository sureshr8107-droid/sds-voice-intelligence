import { Router, Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export const healthRouter = Router();

/**
 * @route   GET /health
 * @desc    Basic liveness probe
 * @access  Public
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  const liveness = HealthService.getLiveness();
  res.status(200).json(liveness);
});

/**
 * @route   GET /api/v1/health
 * @desc    Detailed system and dependency diagnostics
 * @access  Public
 */
healthRouter.get('/api/v1/health', (req: Request, res: Response) => {
  const diagnostics = HealthService.getDetailedDiagnostics(req.id ? String(req.id) : undefined);
  res.status(200).json(diagnostics);
});
