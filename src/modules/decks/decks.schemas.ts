import { DeckVisibility } from '@prisma/client';
import { z } from 'zod';

const tagsSchema = z.array(z.string().trim().min(1).max(50)).max(20).optional();

export const createDeckSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    visibility: z.nativeEnum(DeckVisibility).default(DeckVisibility.PRIVATE),
    tags: tagsSchema,
  }),
});

export const updateDeckSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z
    .object({
      title: z.string().trim().min(1).max(120).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      visibility: z.nativeEnum(DeckVisibility).optional(),
      tags: tagsSchema,
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export const deckIdParamSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
