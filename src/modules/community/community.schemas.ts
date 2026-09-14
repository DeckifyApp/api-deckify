import { z } from 'zod';

export const communityDeckListSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().max(10_000).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    tag: z.string().trim().min(1).max(50).optional(),
    sort: z.enum(['recent', 'popular']).default('recent').optional(),
  }),
});

export const communityDeckIdSchema = z.object({
  params: z.object({
    deckId: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
