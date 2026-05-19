import { type Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export async function listTags(search?: string) {
  const where: Prisma.TagWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }
    : undefined;

  return prisma.tag.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}
