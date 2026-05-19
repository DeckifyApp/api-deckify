import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok } from '../../shared/utils/http';
import { getMe, updateMe } from './users.service';

export async function getMeController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const user = await getMe(req.user.id);
  res.json(ok(user));
}

export async function updateMeController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const payload = req.body as { name?: string; avatarUrl?: string | null };
  const user = await updateMe(req.user.id, {
    name: payload.name,
    avatarUrl: payload.avatarUrl,
  });

  res.json(ok(user));
}
