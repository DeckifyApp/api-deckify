import { ERROR_CODES, type ErrorCode } from './errorCodes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(message: string, statusCode = 500, code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code: ErrorCode = ERROR_CODES.BAD_REQUEST) {
    super(message, 400, code);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code: ErrorCode = ERROR_CODES.CONFLICT) {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', code: ErrorCode = ERROR_CODES.VALIDATION_ERROR) {
    super(message, 422, code);
    this.name = 'ValidationError';
  }
}
