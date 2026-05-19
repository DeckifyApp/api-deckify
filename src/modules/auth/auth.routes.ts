import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { authRateLimiter } from '../../shared/middleware/rateLimit.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from './auth.controller';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schemas';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, validate(registerSchema), registerController);
authRoutes.post('/login', authRateLimiter, validate(loginSchema), loginController);
authRoutes.post('/refresh', authRateLimiter, validate(refreshSchema), refreshController);
authRoutes.post('/logout', authRateLimiter, validate(logoutSchema), logoutController);
authRoutes.get('/me', requireAuth, meController);
