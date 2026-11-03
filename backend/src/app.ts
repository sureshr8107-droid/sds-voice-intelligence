import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health.routes';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy if behind reverse proxy (e.g., Render, Nginx), but default to loopback in dev
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 2. Request ID tracking
  app.use(requestIdMiddleware);

  // 3. Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 4. CORS configuration with explicit origins
  const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin '${origin}' is not permitted.`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 5. Rate limiting for API protection
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP. Please try again after some time.',
        timestamp: new Date().toISOString(),
      },
    },
  });
  app.use(apiLimiter);

  // 6. Structured HTTP request logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as any).id,
      autoLogging: {
        ignore: (req) => req.url === '/health', // Suppress noisy health-check logs
      },
    })
  );

  // 7. Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 8. Public root health probe (Liveness)
  app.use(healthRouter);

  // 9. API v1 Router
  app.use(env.API_PREFIX, apiRouter);

  // 10. 404 handler
  app.use(notFoundHandler);

  // 11. Centralized error handling
  app.use(errorHandler);

  return app;
}
