import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { registerAndLogin } from '../helpers/auth';

describe('Card endpoints', () => {
  async function createDeck(accessToken: string) {
    const response = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Deck', visibility: 'PRIVATE' });

    return response.body.data.id as string;
  }

  it('creates a card in own deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'card-owner@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken);

    const response = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        front: 'What is photosynthesis?',
        back: 'Plants convert light into chemical energy.',
        explanation: 'Happens in chloroplasts.',
        imageUrl: 'https://example.com/image.png',
        imageAlt: 'Diagram',
        difficulty: 'MEDIUM',
        position: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.front).toContain('photosynthesis');
  });

  it('updates own card', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'card-owner2@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken);

    const created = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        front: 'Original',
        back: 'Original back',
        difficulty: 'MEDIUM',
        position: 1,
      });

    const cardId = created.body.data.id as string;

    const response = await request(app)
      .patch(`/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ front: 'Updated front' });

    expect(response.status).toBe(200);
    expect(response.body.data.front).toBe('Updated front');
  });

  it('archives own card', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'card-owner3@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken);

    const created = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        front: 'Delete me',
        back: 'Delete me',
        difficulty: 'MEDIUM',
        position: 1,
      });

    const cardId = created.body.data.id as string;

    const response = await request(app)
      .delete(`/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.archived).toBe(true);
  });

  it("rejects creating card in another user's deck", async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'card-owner4@example.com',
      password: 'StrongPassword123',
    });

    const other = await registerAndLogin(app, {
      name: 'Other',
      email: 'card-other4@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken);

    const response = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({
        front: 'Nope',
        back: 'Nope',
        difficulty: 'MEDIUM',
        position: 1,
      });

    expect(response.status).toBe(403);
  });

  it('rejects editing card from saved community deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'card-owner5@example.com',
      password: 'StrongPassword123',
    });

    const saver = await registerAndLogin(app, {
      name: 'Saver',
      email: 'card-saver5@example.com',
      password: 'StrongPassword123',
    });

    const deckCreated = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Public deck', visibility: 'PUBLIC' });

    const deckId = deckCreated.body.data.id as string;

    const cardCreated = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        front: 'Card',
        back: 'Card',
        difficulty: 'MEDIUM',
        position: 1,
      });

    const cardId = cardCreated.body.data.id as string;

    await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    const response = await request(app)
      .patch(`/cards/${cardId}`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send({ front: 'Attempted edit' });

    expect(response.status).toBe(403);
  });
});
