import { Request, Response } from 'express';
import { ApiErrorResponse } from '@call-screening/shared';

export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ApiErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `The requested resource '${req.method} ${req.path}' was not found.`,
      requestId: req.id ? String(req.id) : undefined,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(404).json(errorResponse);
}
