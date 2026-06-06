import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError';
import { ERROR_CODES } from '../../shared/errors/errorCodes';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import {
  createTokenId,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/tokens';

interface AuthPayload {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

function parseDurationToMs(duration: string): number {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error('Invalid token duration format');
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? 'd').toLowerCase();

  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

function toAuthUser(user: User): AuthPayload['user'] {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

async function generateSession(
  user: User,
  client: Prisma.TransactionClient = prisma,
): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = createTokenId();
  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  const expiresAt = new Date(Date.now() + parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d'));

  await client.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthPayload> {
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
      },
    });

    const session = await generateSession(user);

    return {
      user: toAuthUser(user),
      ...session,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Email already in use', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }
    throw error;
  }
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthPayload> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const session = await generateSession(user);

  return {
    user: toAuthUser(user),
    ...session,
  };
}

export async function refreshSession(refreshToken: string): Promise<AuthPayload> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const { session, user } = await prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
    }

    const revoked = await tx.refreshToken.updateMany({
      where: {
        id: stored.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
      throw new UnauthorizedError('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
    }

    return {
      session: await generateSession(stored.user, tx),
      user: stored.user,
    };
  });

  return {
    user: toAuthUser(user),
    ...session,
  };
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getCurrentUser(userId: string): Promise<AuthPayload['user']> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  return toAuthUser(user);
}
