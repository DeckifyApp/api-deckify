import { Router } from 'express';
import { getTagsController } from './tags.controller';

export const tagsRoutes = Router();

tagsRoutes.get('/', getTagsController);
