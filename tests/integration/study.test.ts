import { prisma } from '../../src/config/prisma';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { registerAndLogin } from '../helpers/auth';

describe('Study endpoints', () => {
  async function createPublicDeckWithCards(token: string, cards = 3): Promise<{ deckId: string; cardId: string }> {
    const deckResponse = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Study Deck', visibility: 'PUBLIC' });

    const deckId = deckResponse.body.data.id as string;
    let firstCardId = '';

    for (let i = 0; i < cards; i += 1) {
      const card = await request(app)
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          front: `Q${i + 1}`,
          back: `A${i + 1}`,
          difficulty: 'MEDIUM',
          position: i + 1,
        });

      if (i === 0) {
        firstCardId = card.body.data.id as string;
      }
    }

    return { deckId, cardId: firstCardId };
  }

  it('starts study session and creates card progress', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'study-owner1@example.com',
      password: 'StrongPassword123',
    });

    const student = await registerAndLogin(app, {
      name: 'Student',
      email: 'study-student1@example.com',
      password: 'StrongPassword123',
    });

    const { deckId } = await createPublicDeckWithCards(owner.accessToken, 4);

    const start = await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send();

    expect(start.status).toBe(200);
    expect(start.body.data.initialized).toBe(4);

    const progressCount = await prisma.cardProgress.count({
      where: { userId: student.userId, deckId },
    });

    expect(progressCount).toBe(4);
  });

  it('returns due cards and updates box on GOOD/AGAIN review', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'study-owner2@example.com',
      password: 'StrongPassword123',
    });

    const student = await registerAndLogin(app, {
      name: 'Student',
      email: 'study-student2@example.com',
      password: 'StrongPassword123',
    });

    const { deckId, cardId } = await createPublicDeckWithCards(owner.accessToken, 2);

    await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send();

    const due = await request(app)
      .get(`/study/decks/${deckId}/due`)
      .set('Authorization', `Bearer ${student.accessToken}`);

    expect(due.status).toBe(200);
    expect(due.body.data.length).toBeGreaterThan(0);

    const good = await request(app)
      .post(`/study/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ result: 'GOOD' });

    expect(good.status).toBe(200);
    expect(good.body.data.previousBox).toBe(1);
    expect(good.body.data.nextBox).toBe(2);

    const progressAfterGood = await prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId: student.userId, cardId } },
    });

    expect(progressAfterGood?.leitnerBox).toBe(2);
    expect(new Date(progressAfterGood!.dueAt).getTime()).toBeGreaterThan(Date.now());

    const again = await request(app)
      .post(`/study/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ result: 'AGAIN' });

    expect(again.status).toBe(200);
    expect(again.body.data.nextBox).toBe(1);

    const progressAfterAgain = await prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId: student.userId, cardId } },
    });

    expect(progressAfterAgain?.leitnerBox).toBe(1);

    const logs = await prisma.reviewLog.findMany({
      where: { userId: student.userId, cardId },
    });

    expect(logs.length).toBe(2);
  });

  it('keeps progress isolated per user', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'study-owner3@example.com',
      password: 'StrongPassword123',
    });

    const studentA = await registerAndLogin(app, {
      name: 'Student A',
      email: 'study-student3a@example.com',
      password: 'StrongPassword123',
    });

    const studentB = await registerAndLogin(app, {
      name: 'Student B',
      email: 'study-student3b@example.com',
      password: 'StrongPassword123',
    });

    const { deckId, cardId } = await createPublicDeckWithCards(owner.accessToken, 1);

    await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send();

    await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${studentB.accessToken}`)
      .send();

    await request(app)
      .post(`/study/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${studentA.accessToken}`)
      .send({ result: 'GOOD' });

    const progressA = await prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId: studentA.userId, cardId } },
    });

    const progressB = await prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId: studentB.userId, cardId } },
    });

    expect(progressA?.leitnerBox).toBe(2);
    expect(progressB?.leitnerBox).toBe(1);
  });

  it('prevents reviewing card from inaccessible private deck', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'study-owner4@example.com',
      password: 'StrongPassword123',
    });

    const intruder = await registerAndLogin(app, {
      name: 'Intruder',
      email: 'study-intruder4@example.com',
      password: 'StrongPassword123',
    });

    const deckResponse = await request(app)
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Private study deck', visibility: 'PRIVATE' });

    const deckId = deckResponse.body.data.id as string;

    const cardResponse = await request(app)
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        front: 'Private Q',
        back: 'Private A',
        difficulty: 'MEDIUM',
        position: 1,
      });

    const cardId = cardResponse.body.data.id as string;

    const review = await request(app)
      .post(`/study/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${intruder.accessToken}`)
      .send({ result: 'GOOD' });

    expect(review.status).toBe(403);
  });

  it('returns deck study stats', async () => {
    const owner = await registerAndLogin(app, {
      name: 'Owner',
      email: 'study-owner5@example.com',
      password: 'StrongPassword123',
    });

    const student = await registerAndLogin(app, {
      name: 'Student',
      email: 'study-student5@example.com',
      password: 'StrongPassword123',
    });

    const { deckId, cardId } = await createPublicDeckWithCards(owner.accessToken, 2);

    await request(app)
      .post(`/study/decks/${deckId}/start`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send();

    await request(app)
      .post(`/study/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({ result: 'GOOD' });

    const stats = await request(app)
      .get(`/study/decks/${deckId}/stats`)
      .set('Authorization', `Bearer ${student.accessToken}`);

    expect(stats.status).toBe(200);
    expect(stats.body.data.totalCards).toBe(2);
    expect(stats.body.data.totalReviews).toBe(1);
    expect(stats.body.data.correctReviews).toBe(1);
  });
});
