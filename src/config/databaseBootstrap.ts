import { spawn } from 'node:child_process';
import { Client } from 'pg';
import { env } from './env';

const DEFAULT_MAX_RETRIES = 20;
const DEFAULT_RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

  if (!name) {
    throw new Error('DATABASE_URL must include a database name in the path.');
  }

  return name;
}

function toAdminConnectionUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const params = parsed.searchParams;

  params.delete('schema');
  parsed.search = params.toString();
  parsed.pathname = '/postgres';

  return parsed.toString();
}

function quoteIdentifier(identifier: string): string {
  const escaped = identifier.replaceAll('"', '""');
  return `"${escaped}"`;
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const databaseName = getDatabaseName(databaseUrl);
  const adminUrl = toAdminConnectionUrl(databaseUrl);
  const client = new Client({ connectionString: adminUrl });

  await client.connect();

  try {
    const existsResult = await client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [databaseName],
    );

    const exists = existsResult.rows[0]?.exists === true;

    if (!exists) {
      try {
        await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
        console.log(`[db] Database '${databaseName}' created.`);
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: string }).code
            : undefined;

        if (code !== '42P04') {
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }
}

async function ensureDatabaseIsReachable(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.end();
}

async function runMigrations(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(command, ['prisma', 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prisma migrate deploy failed with exit code ${String(code)}`));
    });
  });
}

async function waitForDatabaseReady(
  databaseUrl: string,
  maxRetries = DEFAULT_MAX_RETRIES,
  delayMs = DEFAULT_RETRY_DELAY_MS,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      if (env.NODE_ENV === 'production') {
        await ensureDatabaseIsReachable(databaseUrl);
      } else {
        await ensureDatabaseExists(databaseUrl);
      }
      return;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      console.warn(
        `[db] Database not ready yet (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error(
    `[db] Failed to connect/bootstrap database after ${maxRetries} attempts: ${String(lastError)}`,
  );
}

export async function bootstrapDatabase(): Promise<void> {
  console.log('[db] Bootstrapping database...');
  await waitForDatabaseReady(env.DATABASE_URL);
  await runMigrations();
  console.log('[db] Database is ready and migrations are up to date.');
}
