import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer loads .env files itself. Local development uses the repository-root .env;
// CI and containers provide real environment variables, which take precedence.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
