import { CardDifficulty } from '@prisma/client';
import { z } from 'zod';

export const deckIdParamSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const cardIdParamSchema = z.object({
  params: z.object({
    cardId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const createCardSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({
    front: z.string().trim().min(1).max(5000),
    back: z.string().trim().min(1).max(5000),
    explanation: z.string().trim().max(5000).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    imageAlt: z.string().trim().max(255).nullable().optional(),
    difficulty: z.nativeEnum(CardDifficulty).default(CardDifficulty.MEDIUM),
    position: z.number().int().nonnegative().default(0),
  }),
});

export const updateCardSchema = z.object({
  params: z.object({
    cardId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z
    .object({
      front: z.string().trim().min(1).max(5000).optional(),
      back: z.string().trim().min(1).max(5000).optional(),
      explanation: z.string().trim().max(5000).nullable().optional(),
      imageUrl: z.string().url().nullable().optional(),
      imageAlt: z.string().trim().max(255).nullable().optional(),
      difficulty: z.nativeEnum(CardDifficulty).optional(),
      position: z.number().int().nonnegative().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});
