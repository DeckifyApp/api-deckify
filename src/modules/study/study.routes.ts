import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { dueCardsController, reviewCardController, startStudyController, studyStatsController } from './study.controller';
import { deckIdParamSchema, dueCardsSchema, reviewCardSchema } from './study.schemas';

export const studyRoutes = Router();

studyRoutes.post('/decks/:deckId/start', requireAuth, validate(deckIdParamSchema), startStudyController);
studyRoutes.get('/decks/:deckId/due', requireAuth, validate(dueCardsSchema), dueCardsController);
studyRoutes.post('/cards/:cardId/review', requireAuth, validate(reviewCardSchema), reviewCardController);
studyRoutes.get('/decks/:deckId/stats', requireAuth, validate(deckIdParamSchema), studyStatsController);
