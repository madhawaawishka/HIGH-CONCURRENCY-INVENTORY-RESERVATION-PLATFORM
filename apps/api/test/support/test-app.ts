import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@stockforge/database';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { APP_CONFIG, type AppConfig } from '../../src/platform/config/app-config.js';

export const ADMIN_KEY = 'integration-test-admin-key-0123456789abcdef';

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly http: App;
  readonly prisma: PrismaClient;
  /** Removes all rows so every test starts from a known, empty state. */
  readonly resetDatabase: () => Promise<void>;
  readonly close: () => Promise<void>;
}

/**
 * Boots the real AppModule against the test container, configured exactly like production
 * (same configureApp). Only the configuration source is replaced.
 */
export async function createTestApp(): Promise<TestApp> {
  const config: AppConfig = {
    environment: 'test',
    http: { port: 0 },
    database: { url: inject('databaseUrl'), poolMax: 20 },
    security: { adminApiKey: ADMIN_KEY },
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: ['error', 'warn'],
  });
  configureApp(app, config);
  // Listen once on an ephemeral port, so concurrent requests share one real server.
  await app.listen(0, '127.0.0.1');

  const prisma = app.get(PrismaClient);
  return {
    app,
    http: app.getHttpServer() as App,
    prisma,
    resetDatabase: async () => {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE audit_logs, inventory, products CASCADE');
    },
    close: () => app.close(),
  };
}
