import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const durationSchema = z.string().regex(/^\d+[smhd]$/i, 'Use a duration such as 15m or 30d');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    ACCESS_TOKEN_EXPIRES_IN: durationSchema,
    REFRESH_TOKEN_EXPIRES_IN: durationSchema,
    CORS_ORIGIN: z.string().default('*'),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;

    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (value[key].length < 32 || value[key] === 'replace_me') {
        context.addIssue({
          code: 'custom',
          message: 'Production secrets must contain at least 32 characters',
          path: [key],
        });
      }
    }

    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: 'custom',
        message: 'Access and refresh secrets must be different',
        path: ['JWT_REFRESH_SECRET'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
