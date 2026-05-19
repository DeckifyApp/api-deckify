import { DeckVisibility, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';
import { buildPaginationMeta, getPagination } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';

interface CommunityListInput {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  sort?: 'recent' | 'popular';
}

function communityDeckToDto(deck: {
  id: string;
  title: string;
  description: string | null;
  visibility: DeckVisibility;
  ownerId: string;
  owner: { id: string; name: string; avatarUrl: string | null };
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  _count: { cards: number; savedBy: number };
}) {
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    visibility: deck.visibility,
    ownerId: deck.ownerId,
    owner: deck.owner,
    cardCount: deck._count.cards,
    saveCount: deck._count.savedBy,
    tags: deck.tags.map((entry) => ({ id: entry.tag.id, name: entry.tag.name, slug: entry.tag.slug })),
  };
}

async function getDeckOrThrow(deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        where: { isArchived: false },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      tags: { include: { tag: true } },
      _count: {
        select: {
          cards: { where: { isArchived: false } },
          savedBy: true,
        },
      },
    },
  });

  if (!deck || deck.isArchived) {
    throw new NotFoundError('Deck not found', ERROR_CODES.DECK_NOT_FOUND);
  }

  return deck;
}

export async function listCommunityDecks(input: CommunityListInput) {
  const { page, limit, skip, take } = getPagination(input);

  const where: Prisma.DeckWhereInput = {
    isArchived: false,
    visibility: DeckVisibility.PUBLIC,
    ...(input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(input.tag
      ? {
          tags: {
            some: {
              tag: {
                slug: slugify(input.tag),
              },
            },
          },
        }
      : {}),
  };

  const orderBy: Prisma.DeckOrderByWithRelationInput[] =
    input.sort === 'popular'
      ? [{ savedBy: { _count: 'desc' } }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  const [total, decks] = await Promise.all([
    prisma.deck.count({ where }),
    prisma.deck.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        tags: { include: { tag: true } },
        _count: {
          select: {
            cards: { where: { isArchived: false } },
            savedBy: true,
          },
        },
      },
    }),
  ]);

  return {
    data: decks.map(communityDeckToDto),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getCommunityDeck(userId: string, deckId: string) {
  const deck = await getDeckOrThrow(deckId);

  const isOwner = deck.ownerId === userId;
  const isPublicLike =
    deck.visibility === DeckVisibility.PUBLIC || deck.visibility === DeckVisibility.UNLISTED;

  if (!isOwner && !isPublicLike) {
    throw new ForbiddenError('This deck is private', ERROR_CODES.ACCESS_DENIED);
  }

  const saved =
    (await prisma.savedDeck.count({
      where: {
        userId,
        deckId,
      },
    })) > 0;

  return {
    ...communityDeckToDto(deck),
    isSaved: saved,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
    cards: deck.cards,
  };
}

export async function saveCommunityDeck(userId: string, deckId: string) {
  const deck = await getDeckOrThrow(deckId);

  if (deck.ownerId === userId) {
    throw new BadRequestError('You cannot save your own deck', ERROR_CODES.CANNOT_SAVE_OWN_DECK);
  }

  if (deck.visibility === DeckVisibility.PRIVATE) {
    throw new ForbiddenError('Private decks cannot be saved', ERROR_CODES.ACCESS_DENIED);
  }

  try {
    await prisma.savedDeck.create({
      data: {
        userId,
        deckId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Deck already saved', ERROR_CODES.SAVED_DECK_ALREADY_EXISTS);
    }
    throw error;
  }

  return { saved: true };
}

export async function unsaveCommunityDeck(userId: string, deckId: string) {
  await prisma.savedDeck.deleteMany({
    where: {
      userId,
      deckId,
    },
  });

  return { saved: false };
}

export async function forkCommunityDeck(userId: string, deckId: string) {
  const sourceDeck = await getDeckOrThrow(deckId);

  const isOwner = sourceDeck.ownerId === userId;
  const isPublicLike =
    sourceDeck.visibility === DeckVisibility.PUBLIC || sourceDeck.visibility === DeckVisibility.UNLISTED;

  if (!isOwner && !isPublicLike) {
    throw new ForbiddenError('Private decks cannot be forked', ERROR_CODES.ACCESS_DENIED);
  }

  const result = await prisma.$transaction(async (tx) => {
    const forkedDeck = await tx.deck.create({
      data: {
        ownerId: userId,
        title: `${sourceDeck.title} (Fork)`,
        description: sourceDeck.description,
        visibility: DeckVisibility.PRIVATE,
        forkedFromDeckId: sourceDeck.id,
      },
    });

    if (sourceDeck.tags.length > 0) {
      await tx.deckTag.createMany({
        data: sourceDeck.tags.map((entry) => ({
          deckId: forkedDeck.id,
          tagId: entry.tagId,
        })),
      });
    }

    if (sourceDeck.cards.length > 0) {
      await tx.card.createMany({
        data: sourceDeck.cards.map((card) => ({
          deckId: forkedDeck.id,
          front: card.front,
          back: card.back,
          explanation: card.explanation,
          imageUrl: card.imageUrl,
          imageAlt: card.imageAlt,
          difficulty: card.difficulty,
          position: card.position,
          isArchived: false,
          forkedFromCardId: card.id,
        })),
      });
    }

    return tx.deck.findUniqueOrThrow({
      where: { id: forkedDeck.id },
      include: {
        _count: { select: { cards: { where: { isArchived: false } } } },
      },
    });
  });

  return {
    id: result.id,
    ownerId: result.ownerId,
    title: result.title,
    description: result.description,
    visibility: result.visibility,
    forkedFromDeckId: result.forkedFromDeckId,
    cardCount: result._count.cards,
  };
}
