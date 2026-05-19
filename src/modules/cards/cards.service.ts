import { type CardDifficulty } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';
import { assertDeckAccessible, assertDeckOwner } from '../decks/decks.service';

async function ensureCard(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: true },
  });

  if (!card || card.isArchived || card.deck.isArchived) {
    throw new NotFoundError('Card not found', ERROR_CODES.CARD_NOT_FOUND);
  }

  return card;
}

export async function createCard(
  userId: string,
  deckId: string,
  input: {
    front: string;
    back: string;
    explanation?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    difficulty: CardDifficulty;
    position: number;
  },
) {
  await assertDeckOwner(deckId, userId);

  const card = await prisma.card.create({
    data: {
      deckId,
      front: input.front,
      back: input.back,
      explanation: input.explanation ?? null,
      imageUrl: input.imageUrl ?? null,
      imageAlt: input.imageAlt ?? null,
      difficulty: input.difficulty,
      position: input.position,
    },
  });

  return card;
}

export async function listDeckCards(userId: string, deckId: string) {
  await assertDeckAccessible(deckId, userId);

  return prisma.card.findMany({
    where: {
      deckId,
      isArchived: false,
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getCardById(userId: string, cardId: string) {
  const card = await ensureCard(cardId);
  await assertDeckAccessible(card.deckId, userId);
  return card;
}

export async function updateCard(
  userId: string,
  cardId: string,
  input: {
    front?: string;
    back?: string;
    explanation?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    difficulty?: CardDifficulty;
    position?: number;
  },
) {
  const card = await ensureCard(cardId);

  if (card.deck.ownerId !== userId) {
    throw new ForbiddenError('You cannot edit this card', ERROR_CODES.ACCESS_DENIED);
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      front: input.front,
      back: input.back,
      explanation: input.explanation,
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt,
      difficulty: input.difficulty,
      position: input.position,
    },
  });

  return updated;
}

export async function archiveCard(userId: string, cardId: string) {
  const card = await ensureCard(cardId);

  if (card.deck.ownerId !== userId) {
    throw new ForbiddenError('You cannot archive this card', ERROR_CODES.ACCESS_DENIED);
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      isArchived: true,
    },
  });

  return { archived: true };
}
