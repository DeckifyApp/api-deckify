import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createDeckController,
  deleteDeckController,
  getDeckController,
  listDecksController,
  updateDeckController,
} from './decks.controller';
import { createDeckSchema, deckIdParamSchema, updateDeckSchema } from './decks.schemas';

export const decksRoutes = Router();

decksRoutes.post('/', requireAuth, validate(createDeckSchema), createDeckController);
decksRoutes.get('/', requireAuth, listDecksController);
decksRoutes.get('/:deckId', requireAuth, validate(deckIdParamSchema), getDeckController);
decksRoutes.patch('/:deckId', requireAuth, validate(updateDeckSchema), updateDeckController);
decksRoutes.delete('/:deckId', requireAuth, validate(deckIdParamSchema), deleteDeckController);
