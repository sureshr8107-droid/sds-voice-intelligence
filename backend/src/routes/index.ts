import { Router } from 'express';
import { healthRouter } from './health.routes';

export const apiRouter = Router();

// Mount health routes under the API router
apiRouter.use(healthRouter);
