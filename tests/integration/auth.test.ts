import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';

describe('Auth endpoints', () => {
  const userPayload = {
    name: 'Henrique',
    email: 'henrique@example.com',
    password: 'StrongPassword123',
  };

  it('registers a user', async () => {
    const response = await request(app).post('/auth/register').send(userPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userPayload.email);
    expect(response.body.data.accessToken).toBeTypeOf('string');
    expect(response.body.data.refreshToken).toBeTypeOf('string');
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/auth/register').send(userPayload);

    const response = await request(app).post('/auth/register').send(userPayload);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('logs in a user', async () => {
    await request(app).post('/auth/register').send(userPayload);

    const response = await request(app).post('/auth/login').send({
      email: userPayload.email,
      password: userPayload.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects invalid password', async () => {
    await request(app).post('/auth/register').send(userPayload);

    const response = await request(app).post('/auth/login').send({
      email: userPayload.email,
      password: 'WrongPassword123',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('refreshes token with rotation and invalidates old token', async () => {
    await request(app).post('/auth/register').send(userPayload);

    const login = await request(app).post('/auth/login').send({
      email: userPayload.email,
      password: userPayload.password,
    });

    const oldRefreshToken = login.body.data.refreshToken;

    const refreshed = await request(app).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.success).toBe(true);
    expect(refreshed.body.data.refreshToken).not.toBe(oldRefreshToken);

    const invalidOldToken = await request(app).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    expect(invalidOldToken.status).toBe(401);
    expect(invalidOldToken.body.success).toBe(false);
  });

  it('logs out and revokes refresh token', async () => {
    await request(app).post('/auth/register').send(userPayload);

    const login = await request(app).post('/auth/login').send({
      email: userPayload.email,
      password: userPayload.password,
    });

    const refreshToken = login.body.data.refreshToken as string;

    const logout = await request(app).post('/auth/logout').send({ refreshToken });

    expect(logout.status).toBe(200);
    expect(logout.body.success).toBe(true);

    const refreshAfterLogout = await request(app).post('/auth/refresh').send({
      refreshToken,
    });

    expect(refreshAfterLogout.status).toBe(401);
    expect(refreshAfterLogout.body.success).toBe(false);
  });
});
