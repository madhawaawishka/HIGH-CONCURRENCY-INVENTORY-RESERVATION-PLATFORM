import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const workspacePackage = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [
    // esbuild cannot emit decorator metadata, which NestJS dependency injection relies on.
    swc.vite({
      tsconfigFile: false,
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2023',
      },
    }),
  ],
  resolve: {
    // Tests run against workspace package sources, so no build step is needed first.
    alias: {
      '@stockforge/shared-kernel': workspacePackage('shared-kernel'),
      '@stockforge/contracts': workspacePackage('contracts'),
      '@stockforge/database': workspacePackage('database'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['{apps,packages}/*/src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['{apps,packages}/*/test/**/*.int-spec.ts'],
          globalSetup: ['apps/api/test/support/global-setup.ts'],
          // Files share one database and reset it between tests, so they run one at a time.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['{apps,packages}/*/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/generated/**', '**/index.ts', '**/main.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
      // Business rules must stay well tested; controllers and repositories are covered by the
      // integration tests instead, so they have no unit-coverage threshold.
      thresholds: {
        'apps/api/src/modules/*/domain/**': { lines: 90, branches: 90 },
        'apps/api/src/modules/*/application/**': { lines: 85, branches: 80 },
        'packages/shared-kernel/src/**': { lines: 90, branches: 85 },
      },
    },
  },
});
