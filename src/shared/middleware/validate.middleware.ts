import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!parsed.success) {
        const message = parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        next(new ValidationError(message));
        return;
      }

      const data = parsed.data as {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };

      if (data.body !== undefined) req.body = data.body;
      if (data.params !== undefined) req.params = data.params as typeof req.params;
      if (data.query !== undefined) {
        Object.defineProperty(req, 'query', {
          configurable: true,
          enumerable: true,
          value: data.query,
          writable: true,
        });
      }

      next();
    } catch {
      next(new ValidationError('Invalid request payload'));
    }
  };
}
