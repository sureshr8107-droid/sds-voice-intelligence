import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { callRouter } from './call.routes';
import { departmentRouter } from './department.routes';
import { staffRouter } from './staff.routes';
import { routingRuleRouter } from './routingRule.routes';
import { callbackRouter } from './callback.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(callRouter);
apiRouter.use(departmentRouter);
apiRouter.use(staffRouter);
apiRouter.use(routingRuleRouter);
apiRouter.use(callbackRouter);

export {
  healthRouter,
  authRouter,
  callRouter,
  departmentRouter,
  staffRouter,
  routingRuleRouter,
  callbackRouter,
};
