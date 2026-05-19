import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import { verifyAccessToken } from '../utils/tokens';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing bearer token', ERROR_CODES.UNAUTHORIZED));
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };

  next();
}
