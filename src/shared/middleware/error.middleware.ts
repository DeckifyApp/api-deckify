import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError, ConflictError, ValidationError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

function prismaToAppError(error: Prisma.PrismaClientKnownRequestError): AppError {
  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists', ERROR_CODES.CONFLICT);
  }

  if (error.code === 'P2025') {
    return new AppError('Resource not found', 404, ERROR_CODES.NOT_FOUND);
  }

  return new AppError('Database error', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Route not found', 404, ERROR_CODES.NOT_FOUND));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let handledError: AppError;

  if (error instanceof AppError) {
    handledError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handledError = prismaToAppError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    handledError = new ValidationError('Invalid database payload');
  } else {
    handledError = new AppError('Internal server error', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }

  res.status(handledError.statusCode).json({
    success: false,
    error: {
      code: handledError.code,
      message: handledError.message,
    },
  });
}
