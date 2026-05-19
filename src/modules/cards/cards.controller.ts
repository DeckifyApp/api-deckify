import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok } from '../../shared/utils/http';
import { archiveCard, createCard, getCardById, listDeckCards, updateCard } from './cards.service';

export async function createCardController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const payload = req.body as {
    front: string;
    back: string;
    explanation?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    position: number;
  };

  const card = await createCard(req.user.id, deckId, payload);
  res.status(201).json(ok(card));
}

export async function listDeckCardsController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const cards = await listDeckCards(req.user.id, deckId);
  res.json(ok(cards));
}

export async function getCardController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const cardId = req.params.cardId as string;
  const card = await getCardById(req.user.id, cardId);
  res.json(ok(card));
}

export async function updateCardController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const cardId = req.params.cardId as string;
  const payload = req.body as {
    front?: string;
    back?: string;
    explanation?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    position?: number;
  };

  const card = await updateCard(req.user.id, cardId, payload);
  res.json(ok(card));
}

export async function deleteCardController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const cardId = req.params.cardId as string;
  const response = await archiveCard(req.user.id, cardId);
  res.json(ok(response));
}
