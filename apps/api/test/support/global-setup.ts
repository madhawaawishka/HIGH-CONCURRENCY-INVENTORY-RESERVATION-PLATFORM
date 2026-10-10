import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

/** Same image as docker-compose.yml, so tests run against the version used in development. */
const POSTGRES_IMAGE = 'postgres:18.6-alpine';

const databasePackageDir = fileURLToPath(
  new URL('../../../../packages/database/', import.meta.url),
);
const prismaCli = fileURLToPath(
  new URL('../../../../packages/database/node_modules/prisma/build/index.js', import.meta.url),
);

/**
 * Starts one real PostgreSQL container for the integration run and applies the real migrations
 * with `prisma migrate deploy`, exactly as a deployment would. Mocks cannot prove constraint,
 * transaction or locking behavior; a real database can.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('stockforge_test')
    .withUsername('stockforge')
    .withPassword('stockforge')
    .start();
  const databaseUrl = container.getConnectionUri();

  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: databasePackageDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  project.provide('databaseUrl', databaseUrl);
  return async () => {
    await container.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
