import { z } from 'zod';

export const tagsQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).optional(),
  }),
  body: z.unknown().optional(),
  params: z.unknown().optional(),
});
