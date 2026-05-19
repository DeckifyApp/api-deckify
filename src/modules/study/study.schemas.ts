import { ReviewResult } from '@prisma/client';
import { z } from 'zod';

export const deckIdParamSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const dueCardsSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
  body: z.object({}).optional(),
});

export const reviewCardSchema = z.object({
  params: z.object({
    cardId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({
    result: z.nativeEnum(ReviewResult),
  }),
});
