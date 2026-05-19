import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { ok } from '../../shared/utils/http';
import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from './auth.service';

export async function registerController(req: Request, res: Response): Promise<void> {
  const payload = await registerUser(req.body as { name: string; email: string; password: string });
  res.status(201).json(ok(payload));
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const payload = await loginUser(req.body as { email: string; password: string });
  res.json(ok(payload));
}

export async function refreshController(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  const payload = await refreshSession(refreshToken);
  res.json(ok(payload));
}

export async function logoutController(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  await logoutSession(refreshToken);
  res.json(ok({ loggedOut: true }));
}

export async function meController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const user = await getCurrentUser(req.user.id);
  res.json(ok(user));
}
