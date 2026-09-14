import { Buffer } from 'node:buffer';
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'Password must not exceed 72 UTF-8 bytes',
  });

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    password: passwordSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(255),
    password: passwordSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1).max(4096),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const logoutSchema = refreshSchema;
