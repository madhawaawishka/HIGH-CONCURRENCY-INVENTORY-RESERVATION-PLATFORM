import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@stockforge/database';

import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        createPrismaClient({
          connectionString: config.database.url,
          maxConnections: config.database.poolMax,
          applicationName: 'stockforge-api',
        }),
    },
  ],
  exports: [PrismaClient],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  /** Closes the connection pool so a stopping process releases its database connections. */
  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
