import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      const zodError = error as ZodError;
      const message = zodError.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      next(new ValidationError(message));
    }
  };
}
