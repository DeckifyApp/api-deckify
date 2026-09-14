import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { app } from '../../src/app';
import { registerAndLogin } from '../helpers/auth';

describe('Security boundaries', () => {
  it('applies validation transforms before the controller runs', async () => {
    const response = await request(app).post('/auth/register').send({
      name: '  Henrique  ',
      email: '  normalized@example.com  ',
      password: 'StrongPassword123',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('normalized@example.com');
  });

  it('rejects non-HTTP card image URLs', async () => {
    const session = await registerAndLogin(app, {
      name: 'Owner',
      email: 'url-owner@example.com',
      password: 'StrongPassword123',
    });

    const deck = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ title: 'Secure deck', visibility: 'PRIVATE' });

    const response = await request(app)
      .post(`/decks/${deck.body.data.id}/cards`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ front: 'Question', back: 'Answer', imageUrl: 'ftp://example.com/card.png' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('rejects malformed JWT payloads and algorithms', async () => {
    const malformedPayloadToken = jwt.sign(
      { email: 'user@example.com', name: 'User', sub: 'not-a-uuid' },
      env.JWT_ACCESS_SECRET,
    );
    const unsignedToken = jwt.sign(
      { email: 'user@example.com', name: 'User', sub: '00000000-0000-0000-0000-000000000000' },
      '',
      { algorithm: 'none' },
    );

    for (const token of [malformedPayloadToken, unsignedToken]) {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    }
  });

  it('bounds the public tag search input', async () => {
    const response = await request(app).get(`/tags?search=${'a'.repeat(51)}`);

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});
