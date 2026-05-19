import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok } from '../../shared/utils/http';
import { archiveDeck, createDeck, getDeckById, listLibraryDecks, updateDeck } from './decks.service';

export async function createDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const payload = req.body as {
    title: string;
    description?: string | null;
    visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
    tags?: string[];
  };

  const deck = await createDeck(req.user.id, payload);

  res.status(201).json(ok(deck));
}

export async function listDecksController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const decks = await listLibraryDecks(req.user.id);
  res.json(ok(decks));
}

export async function getDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const deck = await getDeckById(deckId, req.user.id);
  res.json(ok(deck));
}

export async function updateDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const payload = req.body as {
    title?: string;
    description?: string | null;
    visibility?: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
    tags?: string[];
  };

  const deck = await updateDeck(deckId, req.user.id, payload);
  res.json(ok(deck));
}

export async function deleteDeckController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const result = await archiveDeck(deckId, req.user.id);

  res.json(ok(result));
}
