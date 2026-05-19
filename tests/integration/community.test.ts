import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { registerAndLogin } from '../helpers/auth';

describe('Community endpoints', () => {
  async function createDeck(
    token: string,
    input: { title: string; visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED'; cards?: number },
  ): Promise<string> {
    const deck = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: input.title, visibility: input.visibility });

    const deckId = deck.body.data.id as string;

    const cards = input.cards ?? 0;
    for (let i = 0; i < cards; i += 1) {
      await request(app)
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          front: `Card ${i + 1}`,
          back: `Back ${i + 1}`,
          difficulty: 'MEDIUM',
          position: i + 1,
        });
    }

    return deckId;
  }

  it('shows only public decks in community search', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'community-owner1@example.com',
      password: 'StrongPassword123',
    });

    const viewer = await registerAndLogin(app, {
      name: 'Viewer',
      email: 'community-viewer1@example.com',
      password: 'StrongPassword123',
    });

    const publicDeckId = await createDeck(owner.accessToken, {
      title: 'Biology Public',
      visibility: 'PUBLIC',
    });

    await createDeck(owner.accessToken, {
      title: 'Biology Private',
      visibility: 'PRIVATE',
    });

    const response = await request(app)
      .get('/community/decks?search=biology')
      .set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(response.status).toBe(200);
    const ids = response.body.data.map((item: { id: string }) => item.id);
    expect(ids).toContain(publicDeckId);
    expect(response.body.data.every((item: { visibility: string }) => item.visibility === 'PUBLIC')).toBe(true);
  });

  it('allows saving public deck and rejects saving own/duplicate', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'community-owner2@example.com',
      password: 'StrongPassword123',
    });

    const saver = await registerAndLogin(app, {
      name: 'Saver',
      email: 'community-saver2@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken, {
      title: 'Saveable Deck',
      visibility: 'PUBLIC',
    });

    const saveResponse = await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    expect(saveResponse.status).toBe(201);

    const duplicate = await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    expect(duplicate.status).toBe(409);

    const ownSave = await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send();

    expect(ownSave.status).toBe(400);
  });

  it('allows unsaving deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'community-owner3@example.com',
      password: 'StrongPassword123',
    });

    const saver = await registerAndLogin(app, {
      name: 'Saver',
      email: 'community-saver3@example.com',
      password: 'StrongPassword123',
    });

    const deckId = await createDeck(owner.accessToken, {
      title: 'Saveable',
      visibility: 'PUBLIC',
    });

    await request(app)
      .post(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    const unsaveResponse = await request(app)
      .delete(`/community/decks/${deckId}/save`)
      .set('Authorization', `Bearer ${saver.accessToken}`)
      .send();

    expect(unsaveResponse.status).toBe(200);
    expect(unsaveResponse.body.data.saved).toBe(false);
  });

  it('forks public deck as private and copies cards', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'community-owner4@example.com',
      password: 'StrongPassword123',
    });

    const forker = await registerAndLogin(app, {
      name: 'Forker',
      email: 'community-forker4@example.com',
      password: 'StrongPassword123',
    });

    const sourceDeckId = await createDeck(owner.accessToken, {
      title: 'Forkable Deck',
      visibility: 'PUBLIC',
      cards: 3,
    });

    const forkResponse = await request(app)
      .post(`/community/decks/${sourceDeckId}/fork`)
      .set('Authorization', `Bearer ${forker.accessToken}`)
      .send();

    expect(forkResponse.status).toBe(201);
    expect(forkResponse.body.data.ownerId).toBe(forker.userId);
    expect(forkResponse.body.data.visibility).toBe('PRIVATE');
    expect(forkResponse.body.data.cardCount).toBe(3);

    const forkedDeckId = forkResponse.body.data.id as string;

    const deckDetails = await request(app)
      .get(`/decks/${forkedDeckId}`)
      .set('Authorization', `Bearer ${forker.accessToken}`);

    expect(deckDetails.status).toBe(200);
    expect(deckDetails.body.data.forkedFromDeckId).toBe(sourceDeckId);
  });
});
