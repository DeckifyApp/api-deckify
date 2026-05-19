import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { getMeController, updateMeController } from './users.controller';
import { updateMeSchema } from './users.schemas';

export const usersRoutes = Router();

usersRoutes.get('/me', requireAuth, getMeController);
usersRoutes.patch('/me', requireAuth, validate(updateMeSchema), updateMeController);
