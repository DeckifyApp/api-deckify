import bcrypt from 'bcryptjs';
import { DeckVisibility, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createUserFixture(input: { name: string; email: string; password?: string }) {
  const passwordHash = await bcrypt.hash(input.password ?? 'StrongPassword123', 12);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
  });
}

export async function createDeckFixture(input: {
  ownerId: string;
  title: string;
  visibility?: DeckVisibility;
  isArchived?: boolean;
  cards?: number;
}) {
  const deck = await prisma.deck.create({
    data: {
      ownerId: input.ownerId,
      title: input.title,
      visibility: input.visibility ?? DeckVisibility.PRIVATE,
      isArchived: input.isArchived ?? false,
    },
  });

  const totalCards = input.cards ?? 0;
  if (totalCards > 0) {
    await prisma.card.createMany({
      data: Array.from({ length: totalCards }).map((_, index) => ({
        deckId: deck.id,
        front: `Front ${index + 1}`,
        back: `Back ${index + 1}`,
        position: index + 1,
      })),
    });
  }

  return deck;
}

export async function saveDeckFixture(input: { userId: string; deckId: string }) {
  return prisma.savedDeck.create({
    data: {
      userId: input.userId,
      deckId: input.deckId,
    },
  });
}
