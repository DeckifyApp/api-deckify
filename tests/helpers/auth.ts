import type { Express } from 'express';
import request from 'supertest';

export async function registerAndLogin(
  app: Express,
  input: { name: string; email: string; password: string },
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  await request(app).post('/auth/register').send(input);

  const login = await request(app).post('/auth/login').send({
    email: input.email,
    password: input.password,
  });

  return {
    accessToken: login.body.data.accessToken,
    refreshToken: login.body.data.refreshToken,
    userId: login.body.data.user.id,
  };
}
