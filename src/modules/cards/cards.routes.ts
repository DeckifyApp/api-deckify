import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createCardController,
  deleteCardController,
  getCardController,
  listDeckCardsController,
  updateCardController,
} from './cards.controller';
import {
  cardIdParamSchema,
  createCardSchema,
  deckIdParamSchema,
  updateCardSchema,
} from './cards.schemas';

export const cardsRoutes = Router();

cardsRoutes.post('/decks/:deckId/cards', requireAuth, validate(createCardSchema), createCardController);
cardsRoutes.get('/decks/:deckId/cards', requireAuth, validate(deckIdParamSchema), listDeckCardsController);
cardsRoutes.get('/cards/:cardId', requireAuth, validate(cardIdParamSchema), getCardController);
cardsRoutes.patch('/cards/:cardId', requireAuth, validate(updateCardSchema), updateCardController);
cardsRoutes.delete('/cards/:cardId', requireAuth, validate(cardIdParamSchema), deleteCardController);
