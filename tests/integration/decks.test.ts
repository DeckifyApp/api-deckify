import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { registerAndLogin } from '../helpers/auth';

describe('Deck endpoints', () => {
  it('creates a deck', async () => {
    const session = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner@example.com',
      password: 'StrongPassword123',
    });

    const response = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        title: 'Biology Basics',
        description: 'Intro deck',
        visibility: 'PRIVATE',
        tags: ['biology', 'science'],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Biology Basics');
  });

  it('lists own decks and saved decks', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner2@example.com',
      password: 'StrongPassword123',
    });

    const saver = await registerAndLogin(app, {
      name: 'Saver',
      email: 'saver2@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app).post('/decks').set('Authorization', `Bearer ${owner.accessToken}`).send({
      title: 'Public Deck',
      visibility: 'PUBLIC',
    });

    const deckId = created.body.data.id as string;

    await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    const response = await request(app).get('/decks').set('Authorization', `Bearer ${saver.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const saved = response.body.data.find((item: { id: string; isSaved: boolean }) => item.id === deckId);
    expect(saved?.isSaved).toBe(true);
  });

  it('removes saved access when the owner makes a deck private', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner-private@example.com',
      password: 'StrongPassword123',
    });
    const saver = await registerAndLogin(app, {
      name: 'Saver',
      email: 'saver-private@example.com',
      password: 'StrongPassword123',
    });
    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Public then private', visibility: 'PUBLIC' });
    const deckId = created.body.data.id as string;

    await request(app).post(`/community/decks/${deckId}/save`).set('Authorization', `Bearer ${saver.accessToken}`);
    await request(app)
      .patch(`/decks/${deckId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ visibility: 'PRIVATE' });

    const library = await request(app).get('/decks').set('Authorization', `Bearer ${saver.accessToken}`);
    const study = await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${saver.accessToken}`);

    expect(library.body.data).toHaveLength(0);
    expect(study.status).toBe(403);
  });

  it('updates own deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner3@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Original Title', visibility: 'PRIVATE' });

    const deckId = created.body.data.id as string;

    const updated = await request(app)
      .patch(`/decks/${deckId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Updated Title', visibility: 'PUBLIC' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe('Updated Title');
    expect(updated.body.data.visibility).toBe('PUBLIC');
  });

  it("rejects updating another user's deck", async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner4@example.com',
      password: 'StrongPassword123',
    });

    const other = await registerAndLogin(app, {
      name: 'Other',
      email: 'other4@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Owner Deck', visibility: 'PRIVATE' });

    const deckId = created.body.data.id as string;

    const response = await request(app)
      .patch(`/decks/${deckId}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ title: 'Hacked Title' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('archives own deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner5@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Archive Me', visibility: 'PRIVATE' });

    const deckId = created.body.data.id as string;

    const response = await request(app).delete(`/decks/${deckId}`).set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.archived).toBe(true);
  });

  it("rejects viewing another user's private deck", async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner6@example.com',
      password: 'StrongPassword123',
    });

    const other = await registerAndLogin(app, {
      name: 'Other',
      email: 'other6@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Private Deck', visibility: 'PRIVATE' });

    const deckId = created.body.data.id as string;

    const response = await request(app).get(`/decks/${deckId}`).set('Authorization', `Bearer ${other.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('allows viewing public deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'owner7@example.com',
      password: 'StrongPassword123',
    });

    const other = await registerAndLogin(app, {
      name: 'Other',
      email: 'other7@example.com',
      password: 'StrongPassword123',
    });

    const created = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Public Deck', visibility: 'PUBLIC' });

    const deckId = created.body.data.id as string;

    const response = await request(app).get(`/decks/${deckId}`).set('Authorization', `Bearer ${other.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.visibility).toBe('PUBLIC');
  });
});
