import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { setupSwagger } from './config/swagger';
import { authRoutes } from './modules/auth/auth.routes';
import { cardsRoutes } from './modules/cards/cards.routes';
import { communityRoutes } from './modules/community/community.routes';
import { decksRoutes } from './modules/decks/decks.routes';
import { studyRoutes } from './modules/study/study.routes';
import { tagsRoutes } from './modules/tags/tags.routes';
import { usersRoutes } from './modules/users/users.routes';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { apiRateLimiter } from './shared/middleware/rateLimit.middleware';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((x) => x.trim()),
  }),
);

app.use(apiRateLimiter);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/decks', decksRoutes);
app.use('/', cardsRoutes);
app.use('/community', communityRoutes);
app.use('/study', studyRoutes);
app.use('/tags', tagsRoutes);

if (env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

app.use(notFoundHandler);
app.use(errorHandler);
