import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware';
import { getTagsController } from './tags.controller';
import { tagsQuerySchema } from './tags.schemas';

export const tagsRoutes = Router();

tagsRoutes.get('/', validate(tagsQuerySchema), getTagsController);
