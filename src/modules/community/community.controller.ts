import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok, okList } from '../../shared/utils/http';
import {
  forkCommunityDeck,
  getCommunityDeck,
  listCommunityDecks,
  saveCommunityDeck,
  unsaveCommunityDeck,
} from './community.service';

export async function listCommunityDecksController(req: Request, res: Response): Promise<void> {
  const query = req.query as {
    page?: string;
    limit?: string;
    search?: string;
    tag?: string;
    sort?: 'recent' | 'popular';
  };

  const result = await listCommunityDecks({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    search: query.search,
    tag: query.tag,
    sort: query.sort,
  });

  res.json(okList(result.data, result.pagination));
}

export async function getCommunityDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const deck = await getCommunityDeck(req.user.id, deckId);
  res.json(ok(deck));
}

export async function saveCommunityDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const result = await saveCommunityDeck(req.user.id, deckId);
  res.status(201).json(ok(result));
}

export async function unsaveCommunityDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const result = await unsaveCommunityDeck(req.user.id, deckId);
  res.json(ok(result));
}

export async function forkCommunityDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const result = await forkCommunityDeck(req.user.id, deckId);
  res.status(201).json(ok(result));
}
