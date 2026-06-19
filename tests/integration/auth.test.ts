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

  it('allows only one concurrent refresh rotation for the same token', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        ...userPayload,
        email: 'henrique-concurrent@example.com',
      });

    const login = await request(app).post('/auth/login').send({
      email: 'henrique-concurrent@example.com',
      password: userPayload.password,
    });

    const oldRefreshToken = login.body.data.refreshToken as string;

    const responses = await Promise.all([
      request(app).post('/auth/refresh').send({ refreshToken: oldRefreshToken }),
      request(app).post('/auth/refresh').send({ refreshToken: oldRefreshToken }),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 401]);

    const refreshed = responses.find((response) => response.status === 200);
    const rejected = responses.find((response) => response.status === 401);

    expect(refreshed?.body.success).toBe(true);
    expect(refreshed?.body.data.refreshToken).not.toBe(oldRefreshToken);
    expect(rejected?.body.success).toBe(false);
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

  it('deletes the account and all active sessions', async () => {
    const registered = await request(app)
      .post('/auth/register')
      .send({
        ...userPayload,
        email: 'delete-me@example.com',
      });
    const { accessToken, refreshToken } = registered.body.data;

    const deleted = await request(app).delete('/users/me').set('Authorization', `Bearer ${accessToken}`);
    const refreshAfterDelete = await request(app).post('/auth/refresh').send({ refreshToken });

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);
    expect(refreshAfterDelete.status).toBe(401);
  });
});
