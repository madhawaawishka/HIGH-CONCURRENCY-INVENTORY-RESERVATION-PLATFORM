import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/generated/**', '**/node_modules/**'],
  },

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: {
          // Root tool configs belong to no workspace project; type-check them with the base config.
          allowDefaultProject: ['*.mjs', '*.cjs', 'vitest.config.ts'],
          defaultProject: 'tsconfig.base.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      // NestJS modules are classes that exist only to carry decorators.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['**/*.spec.ts', '**/*.int-spec.ts', '**/test/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // Supertest's `.expect(status)` chains are assertions too.
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'request.**.expect'] }],
      // Matchers such as expect(mock.method) reference methods without calling them.
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    // Command-line scripts (seeds, tooling) report progress on stdout.
    files: ['**/prisma/seed*.ts', '**/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    files: ['**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  prettier,
);
