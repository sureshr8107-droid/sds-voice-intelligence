import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];

  let id: string;
  if (typeof existingId === 'string' && existingId.length > 0 && UUID_REGEX.test(existingId)) {
    id = existingId;
  } else {
    id = randomUUID();
  }

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
