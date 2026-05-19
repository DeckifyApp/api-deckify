import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  forkCommunityDeckController,
  getCommunityDeckController,
  listCommunityDecksController,
  saveCommunityDeckController,
  unsaveCommunityDeckController,
} from './community.controller';
import { communityDeckIdSchema, communityDeckListSchema } from './community.schemas';

export const communityRoutes = Router();

communityRoutes.get('/decks', requireAuth, validate(communityDeckListSchema), listCommunityDecksController);
communityRoutes.get('/decks/:deckId', requireAuth, validate(communityDeckIdSchema), getCommunityDeckController);
communityRoutes.post('/decks/:deckId/save', requireAuth, validate(communityDeckIdSchema), saveCommunityDeckController);
communityRoutes.delete(
  '/decks/:deckId/save',
  requireAuth,
  validate(communityDeckIdSchema),
  unsaveCommunityDeckController,
);
communityRoutes.post('/decks/:deckId/fork', requireAuth, validate(communityDeckIdSchema), forkCommunityDeckController);
