import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { bootstrapDatabase } from '../../src/config/databaseBootstrap';
import { prisma } from '../../src/config/prisma';
import { resetDatabase } from './db';

declare global {
  var __testsDbBootstrapped: boolean | undefined;
}

dotenv.config({ path: '.env' });
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  if (!globalThis.__testsDbBootstrapped) {
    await bootstrapDatabase();
    globalThis.__testsDbBootstrapped = true;
  }

  await prisma.$connect();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});
