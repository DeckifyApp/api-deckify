import { DeckVisibility, ReviewResult } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';
import { dueDateForBox, nextBox } from './leitner.service';

async function assertStudyDeckAccess(deckId: string, userId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
  });

  if (!deck || deck.isArchived) {
    throw new NotFoundError('Deck not found', ERROR_CODES.DECK_NOT_FOUND);
  }

  const isOwner = deck.ownerId === userId;
  const hasPublicAccess = deck.visibility === DeckVisibility.PUBLIC || deck.visibility === DeckVisibility.UNLISTED;

  if (!isOwner && !hasPublicAccess) {
    throw new ForbiddenError('You cannot study this deck', ERROR_CODES.ACCESS_DENIED);
  }

  return deck;
}

export async function startStudySession(deckId: string, userId: string) {
  await assertStudyDeckAccess(deckId, userId);

  const activeCards = await prisma.card.findMany({
    where: {
      deckId,
      isArchived: false,
    },
    select: { id: true },
  });

  const existingProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      cardId: {
        in: activeCards.map((card) => card.id),
      },
    },
    select: { cardId: true },
  });

  const existingCardIds = new Set(existingProgress.map((item) => item.cardId));
  const missingCardIds = activeCards.map((card) => card.id).filter((id) => !existingCardIds.has(id));

  if (missingCardIds.length > 0) {
    await prisma.cardProgress.createMany({
      data: missingCardIds.map((cardId) => ({
        userId,
        deckId,
        cardId,
        leitnerBox: 1,
        dueAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  return {
    initialized: missingCardIds.length,
    totalCards: activeCards.length,
  };
}

export async function getDueCards(deckId: string, userId: string, limit = 20) {
  await assertStudyDeckAccess(deckId, userId);
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  const cards = await prisma.cardProgress.findMany({
    where: {
      userId,
      deckId,
      dueAt: { lte: new Date() },
      card: {
        isArchived: false,
      },
    },
    include: {
      card: true,
    },
    orderBy: [{ dueAt: 'asc' }, { updatedAt: 'asc' }],
    take: safeLimit,
  });

  return cards.map((item) => ({
    progressId: item.id,
    cardId: item.cardId,
    leitnerBox: item.leitnerBox,
    dueAt: item.dueAt,
    card: item.card,
  }));
}

export async function reviewCard(userId: string, cardId: string, result: ReviewResult) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      deck: true,
    },
  });

  if (!card || card.isArchived || card.deck.isArchived) {
    throw new NotFoundError('Card not found', ERROR_CODES.CARD_NOT_FOUND);
  }

  await assertStudyDeckAccess(card.deckId, userId);

  return prisma.$transaction(async (tx) => {
    let progress = await tx.cardProgress.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId,
        },
      },
    });

    if (!progress) {
      progress = await tx.cardProgress.create({
        data: {
          userId,
          deckId: card.deckId,
          cardId: card.id,
          leitnerBox: 1,
          dueAt: new Date(),
        },
      });
    }

    const previousBox = progress.leitnerBox;
    const next = nextBox(previousBox, result);
    const nextDueAt = dueDateForBox(next);

    const updatedProgress = await tx.cardProgress.update({
      where: { id: progress.id },
      data: {
        leitnerBox: next,
        dueAt: nextDueAt,
        lastReviewedAt: new Date(),
        totalReviews: { increment: 1 },
        correctReviews: result === ReviewResult.GOOD ? { increment: 1 } : undefined,
        incorrectReviews: result === ReviewResult.AGAIN ? { increment: 1 } : undefined,
      },
    });

    const log = await tx.reviewLog.create({
      data: {
        userId,
        deckId: card.deckId,
        cardId: card.id,
        result,
        previousBox,
        nextBox: next,
      },
    });

    return {
      cardId: card.id,
      result,
      previousBox,
      nextBox: next,
      dueAt: updatedProgress.dueAt,
      progress: updatedProgress,
      reviewLogId: log.id,
    };
  });
}

export async function getStudyStats(deckId: string, userId: string) {
  await assertStudyDeckAccess(deckId, userId);

  const [totalCards, dueCards, cardsByBoxRaw, aggregate, lastLog] = await Promise.all([
    prisma.card.count({
      where: {
        deckId,
        isArchived: false,
      },
    }),
    prisma.cardProgress.count({
      where: {
        userId,
        deckId,
        dueAt: { lte: new Date() },
        card: { isArchived: false },
      },
    }),
    prisma.cardProgress.groupBy({
      by: ['leitnerBox'],
      where: { userId, deckId, card: { isArchived: false } },
      _count: { _all: true },
    }),
    prisma.cardProgress.aggregate({
      where: { userId, deckId, card: { isArchived: false } },
      _sum: {
        totalReviews: true,
        correctReviews: true,
        incorrectReviews: true,
      },
    }),
    prisma.reviewLog.findFirst({
      where: { userId, deckId },
      orderBy: { reviewedAt: 'desc' },
      select: { reviewedAt: true },
    }),
  ]);

  const cardsByBox: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };

  cardsByBoxRaw.forEach((row) => {
    const key = String(row.leitnerBox);
    if (key in cardsByBox) {
      cardsByBox[key] = row._count._all;
    }
  });

  const totalReviews = aggregate._sum.totalReviews ?? 0;
  const correctReviews = aggregate._sum.correctReviews ?? 0;
  const incorrectReviews = aggregate._sum.incorrectReviews ?? 0;

  return {
    totalCards,
    dueCards,
    cardsByBox,
    totalReviews,
    correctReviews,
    incorrectReviews,
    accuracyPercentage: totalReviews > 0 ? Number(((correctReviews / totalReviews) * 100).toFixed(2)) : 0,
    lastReviewedAt: lastLog?.reviewedAt ?? null,
  };
}
