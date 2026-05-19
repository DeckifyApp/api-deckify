import { z } from 'zod';

export const updateMeSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      avatarUrl: z.string().url().max(500).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});
