import { CardDifficulty, DeckVisibility, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CARD_PROMPTS = [
  {
    front: 'What is photosynthesis?',
    back: 'A process where plants convert light into chemical energy.',
  },
  {
    front: 'What is mitosis?',
    back: 'Cell division process producing two identical daughter cells.',
  },
  {
    front: 'What is osmosis?',
    back: 'Movement of water through a semipermeable membrane.',
  },
  {
    front: 'What is an atom?',
    back: 'Smallest unit of matter that retains element identity.',
  },
  {
    front: 'What is a function in programming?',
    back: 'Reusable block of code designed to perform a task.',
  },
  {
    front: 'What is a variable?',
    back: 'Named storage location that holds a value.',
  },
  {
    front: 'What is the capital of France?',
    back: 'Paris.',
  },
  {
    front: 'What is the Pythagorean theorem?',
    back: 'In right triangles, a² + b² = c².',
  },
  {
    front: 'Who wrote Hamlet?',
    back: 'William Shakespeare.',
  },
  {
    front: 'What is gravity?',
    back: 'A force attracting bodies with mass toward one another.',
  },
  {
    front: 'What is 2 + 2?',
    back: '4.',
  },
  {
    front: 'What is HTTP?',
    back: 'Protocol for transferring web resources.',
  },
];

const difficulties = [CardDifficulty.EASY, CardDifficulty.MEDIUM, CardDifficulty.HARD];

function buildCards(count: number) {
  return Array.from({ length: count }).map((_, index) => {
    const base = CARD_PROMPTS[index % CARD_PROMPTS.length]!;
    return {
      front: `${base.front} (#${index + 1})`,
      back: base.back,
      explanation: `Explanation for card ${index + 1}.`,
      imageUrl: index % 3 === 0 ? `https://picsum.photos/seed/deckify-${index + 1}/600/400` : null,
      imageAlt: index % 3 === 0 ? `Illustration for card ${index + 1}` : null,
      difficulty: difficulties[index % difficulties.length]!,
      position: index + 1,
    };
  });
}

async function ensureTags(tagNames: string[]) {
  for (const name of tagNames) {
    const slug = name.toLowerCase().trim().replace(/\s+/g, '-');
    await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }
}

async function connectTags(deckId: string, tagNames: string[]) {
  const tags = await prisma.tag.findMany({
    where: { slug: { in: tagNames.map((name) => name.toLowerCase().replace(/\s+/g, '-')) } },
  });

  await prisma.deckTag.createMany({
    data: tags.map((tag) => ({ deckId, tagId: tag.id })),
    skipDuplicates: true,
  });
}

async function main() {
  await prisma.reviewLog.deleteMany();
  await prisma.cardProgress.deleteMany();
  await prisma.savedDeck.deleteMany();
  await prisma.deckTag.deleteMany();
  await prisma.card.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('StrongPassword123', 12);

  const [henrique, alice, bob] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Henrique',
        email: 'henrique@example.com',
        passwordHash,
        avatarUrl: 'https://example.com/avatars/henrique.png',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash,
        avatarUrl: 'https://example.com/avatars/alice.png',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Bob',
        email: 'bob@example.com',
        passwordHash,
        avatarUrl: 'https://example.com/avatars/bob.png',
      },
    }),
  ]);

  await ensureTags(['programming', 'biology', 'history', 'math', 'english', 'science']);

  const deck1 = await prisma.deck.create({
    data: {
      ownerId: henrique.id,
      title: 'Biology Basics',
      description: 'Intro biology deck for beginners.',
      visibility: DeckVisibility.PUBLIC,
      cards: { create: buildCards(12) },
    },
  });

  const deck2 = await prisma.deck.create({
    data: {
      ownerId: henrique.id,
      title: 'TypeScript Foundations',
      description: 'Core TS concepts and syntax.',
      visibility: DeckVisibility.UNLISTED,
      cards: { create: buildCards(8) },
    },
  });

  const deck3 = await prisma.deck.create({
    data: {
      ownerId: alice.id,
      title: 'World History Quick Facts',
      description: 'Key world history flashcards.',
      visibility: DeckVisibility.PUBLIC,
      cards: { create: buildCards(10) },
    },
  });

  const deck4 = await prisma.deck.create({
    data: {
      ownerId: alice.id,
      title: 'Private Exam Prep',
      description: 'Alice private notes for exams.',
      visibility: DeckVisibility.PRIVATE,
      cards: { create: buildCards(7) },
    },
  });

  const deck5 = await prisma.deck.create({
    data: {
      ownerId: bob.id,
      title: 'Math Essentials',
      description: 'Math drills and formulas.',
      visibility: DeckVisibility.PUBLIC,
      cards: { create: buildCards(11) },
    },
  });

  await Promise.all([
    connectTags(deck1.id, ['biology', 'science']),
    connectTags(deck2.id, ['programming']),
    connectTags(deck3.id, ['history', 'english']),
    connectTags(deck4.id, ['biology']),
    connectTags(deck5.id, ['math', 'science']),
  ]);

  await prisma.savedDeck.create({
    data: {
      userId: bob.id,
      deckId: deck1.id,
    },
  });

  await prisma.savedDeck.create({
    data: {
      userId: henrique.id,
      deckId: deck3.id,
    },
  });

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
