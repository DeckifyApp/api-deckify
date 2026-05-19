import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  return user;
}

export async function updateMe(
  userId: string,
  input: {
    name?: string;
    avatarUrl?: string | null;
  },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      avatarUrl: input.avatarUrl,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
