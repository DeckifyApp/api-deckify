import { prisma } from '../../src/config/prisma';

export async function resetDatabase() {
  await prisma.reviewLog.deleteMany();
  await prisma.cardProgress.deleteMany();
  await prisma.savedDeck.deleteMany();
  await prisma.deckTag.deleteMany();
  await prisma.card.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
}
