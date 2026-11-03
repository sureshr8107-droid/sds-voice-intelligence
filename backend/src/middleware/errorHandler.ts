import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@call-screening/shared';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

  // Log error with structured details
  logger.error(
    {
      err: {
        message: err.message,
        stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
      },
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    },
    'Request encountered an unhandled or application error'
  );

  // Return safe error response (no stack trace or internal paths)
  const safeMessage =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred. Please contact system support.'
      : err.message;

  const errorResponse: ApiErrorResponse = {
    error: {
      code: errorCode,
      message: safeMessage,
      details: err.details,
      requestId: req.id ? String(req.id) : undefined,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(errorResponse);
}
