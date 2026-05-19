import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok } from '../../shared/utils/http';
import { getDueCards, getStudyStats, reviewCard, startStudySession } from './study.service';

export async function startStudyController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const result = await startStudySession(deckId, req.user.id);
  res.json(ok(result));
}

export async function dueCardsController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const limitRaw = req.query.limit;
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : 20;

  const cards = await getDueCards(deckId, req.user.id, limit);
  res.json(ok(cards));
}

export async function reviewCardController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const cardId = req.params.cardId as string;
  const { result } = req.body as { result: 'AGAIN' | 'GOOD' };
  const data = await reviewCard(req.user.id, cardId, result);

  res.json(ok(data));
}

export async function studyStatsController(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Unauthorized');

  const deckId = req.params.deckId as string;
  const stats = await getStudyStats(deckId, req.user.id);
  res.json(ok(stats));
}
