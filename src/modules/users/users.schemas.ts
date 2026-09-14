import { z } from 'zod';
import { isHttpUrl } from '../../shared/utils/urls';

export const updateMeSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      avatarUrl: z
        .string()
        .url()
        .max(500)
        .refine(isHttpUrl, 'URL must use HTTP or HTTPS without embedded credentials')
        .nullable()
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});
