import { DeckVisibility, type Deck, type Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';
import { slugify } from '../../shared/utils/slugify';

async function ensureDeckExists(deckId: string): Promise<Deck> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.isArchived) {
    throw new NotFoundError('Deck not found', ERROR_CODES.DECK_NOT_FOUND);
  }
  return deck;
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

async function replaceDeckTags(tx: Prisma.TransactionClient, deckId: string, tags: string[]): Promise<void> {
  await tx.deckTag.deleteMany({ where: { deckId } });

  if (tags.length === 0) {
    return;
  }

  const tagIds: string[] = [];
  for (const name of tags) {
    const slug = slugify(name);
    const tag = await tx.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    tagIds.push(tag.id);
  }

  await tx.deckTag.createMany({
    data: tagIds.map((tagId) => ({ deckId, tagId })),
    skipDuplicates: true,
  });
}

export async function assertDeckOwner(deckId: string, userId: string): Promise<void> {
  const deck = await ensureDeckExists(deckId);
  if (deck.ownerId !== userId) {
    throw new ForbiddenError('You do not own this deck', ERROR_CODES.ACCESS_DENIED);
  }
}

export async function assertDeckAccessible(deckId: string, userId: string): Promise<Deck> {
  const deck = await ensureDeckExists(deckId);
  const isOwner = deck.ownerId === userId;
  const isPublicLike = deck.visibility === DeckVisibility.PUBLIC || deck.visibility === DeckVisibility.UNLISTED;

  if (!isOwner && !isPublicLike) {
    throw new ForbiddenError('You cannot access this deck', ERROR_CODES.ACCESS_DENIED);
  }

  return deck;
}

export async function createDeck(
  ownerId: string,
  input: {
    title: string;
    description?: string | null;
    visibility: DeckVisibility;
    tags?: string[];
  },
) {
  const tags = normalizeTags(input.tags);

  const deck = await prisma.$transaction(async (tx) => {
    const created = await tx.deck.create({
      data: {
        ownerId,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
      },
    });

    await replaceDeckTags(tx, created.id, tags);

    return tx.deck.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        tags: { include: { tag: true } },
        _count: {
          select: {
            cards: {
              where: { isArchived: false },
            },
          },
        },
      },
    });
  });

  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    visibility: deck.visibility,
    ownerId: deck.ownerId,
    isOwner: true,
    isSaved: false,
    cardCount: deck._count.cards,
    tags: deck.tags.map((entry) => entry.tag.name),
  };
}

export async function listLibraryDecks(userId: string) {
  const [ownedDecks, savedDecks] = await Promise.all([
    prisma.deck.findMany({
      where: {
        ownerId: userId,
        isArchived: false,
      },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { cards: { where: { isArchived: false } } } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.savedDeck.findMany({
      where: {
        userId,
        deck: {
          isArchived: false,
          visibility: { not: DeckVisibility.PRIVATE },
        },
      },
      include: {
        deck: {
          include: {
            tags: { include: { tag: true } },
            _count: { select: { cards: { where: { isArchived: false } } } },
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    }),
  ]);

  const owned = ownedDecks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    visibility: deck.visibility,
    ownerId: deck.ownerId,
    isOwner: true,
    isSaved: false,
    cardCount: deck._count.cards,
    tags: deck.tags.map((entry) => entry.tag.name),
  }));

  const saved = savedDecks.map((savedDeck) => ({
    id: savedDeck.deck.id,
    title: savedDeck.deck.title,
    description: savedDeck.deck.description,
    visibility: savedDeck.deck.visibility,
    ownerId: savedDeck.deck.ownerId,
    isOwner: savedDeck.deck.ownerId === userId,
    isSaved: true,
    cardCount: savedDeck.deck._count.cards,
    tags: savedDeck.deck.tags.map((entry) => entry.tag.name),
  }));

  return [...owned, ...saved];
}

export async function getDeckById(deckId: string, userId: string) {
  const deck = await assertDeckAccessible(deckId, userId);

  const fullDeck = await prisma.deck.findUniqueOrThrow({
    where: { id: deck.id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      tags: { include: { tag: true } },
      _count: { select: { cards: { where: { isArchived: false } }, savedBy: true } },
    },
  });

  const isSaved =
    (await prisma.savedDeck.count({
      where: {
        userId,
        deckId,
      },
    })) > 0;

  return {
    id: fullDeck.id,
    title: fullDeck.title,
    description: fullDeck.description,
    visibility: fullDeck.visibility,
    ownerId: fullDeck.ownerId,
    isOwner: fullDeck.ownerId === userId,
    isSaved,
    cardCount: fullDeck._count.cards,
    saveCount: fullDeck._count.savedBy,
    owner: fullDeck.owner,
    tags: fullDeck.tags.map((entry) => entry.tag.name),
    createdAt: fullDeck.createdAt,
    updatedAt: fullDeck.updatedAt,
    forkedFromDeckId: fullDeck.forkedFromDeckId,
  };
}

export async function updateDeck(
  deckId: string,
  userId: string,
  input: {
    title?: string;
    description?: string | null;
    visibility?: DeckVisibility;
    tags?: string[];
  },
) {
  await assertDeckOwner(deckId, userId);
  const tags = input.tags ? normalizeTags(input.tags) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.deck.update({
      where: { id: deckId },
      data: {
        title: input.title,
        description: input.description,
        visibility: input.visibility,
      },
    });

    if (tags) {
      await replaceDeckTags(tx, deckId, tags);
    }
  });

  return getDeckById(deckId, userId);
}

export async function archiveDeck(deckId: string, userId: string) {
  await assertDeckOwner(deckId, userId);

  await prisma.deck.update({
    where: { id: deckId },
    data: {
      isArchived: true,
    },
  });

  return { archived: true };
}
