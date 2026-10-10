import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

export interface DatabaseClientOptions {
  readonly connectionString: string;
  /**
   * Maximum connections in this process's pool. The sum across all API instances and workers
   * must stay below PostgreSQL's max_connections (connection budget, spec Section 25).
   */
  readonly maxConnections: number;
  /** How long a request may wait for a free pool connection before failing fast. */
  readonly connectionTimeoutMs?: number;
  readonly idleTimeoutMs?: number;
  /** Shown in pg_stat_activity, which makes connections attributable to a process. */
  readonly applicationName?: string;
}

/**
 * Creates a Prisma client backed by an explicitly sized node-postgres pool. Pool settings are
 * deliberate rather than driver defaults, because the pool is a shared, scarce resource.
 */
export function createPrismaClient(options: DatabaseClientOptions): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: options.connectionString,
    max: options.maxConnections,
    connectionTimeoutMillis: options.connectionTimeoutMs ?? 5_000,
    idleTimeoutMillis: options.idleTimeoutMs ?? 30_000,
    application_name: options.applicationName ?? 'stockforge',
  });
  return new PrismaClient({ adapter });
}
