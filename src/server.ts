import { app } from './app';
import { bootstrapDatabase } from './config/databaseBootstrap';
import { env } from './config/env';

async function startServer(): Promise<void> {
  await bootstrapDatabase();

  app.listen(env.PORT, () => {
    console.log(`Deckify API listening on port ${env.PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error('[bootstrap] Failed to start server.', error);
  process.exit(1);
});
