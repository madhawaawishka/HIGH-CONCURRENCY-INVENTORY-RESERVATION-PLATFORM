# ADR-0004: Toolchain — pnpm workspaces, TypeScript 6, NestJS 12 (ESM), Vitest

- Status: Accepted
- Date: 2026-10-10

## Context

The specification named NestJS, TypeScript and Jest. When the build started (October 2026), the ecosystem had moved:

- **NestJS 12** ships as ESM only. Jest can load it only through `require(esm)`, and Jest's own ESM mode is still experimental. Nest now generates ESM projects with Vitest by default.
- **TypeScript 7** (the native compiler) is out, but typescript-eslint, `@nestjs/swagger` and the Nest CLI support TypeScript up to 6.x.

## Decision

- **pnpm workspaces**: `apps/*` (the API, later the workers) and `packages/*` (`shared-kernel`, `contracts`, `database`). Workspace packages expose TypeScript sources through a custom export condition (`@stockforge/source`) for the IDE, type checking and tests, and compiled `dist` output at runtime. `tsc -b` builds everything with project references.
- **TypeScript 6.0** in strict mode, with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax`. Dependabot ignores TypeScript major updates until the tooling supports version 7.
- **NestJS 12 as native ESM** (`"type": "module"`, `.js` import extensions).
- **Vitest** instead of Jest, with SWC (`unplugin-swc`), because esbuild cannot emit the decorator metadata that Nest dependency injection needs. Supertest and Testcontainers are unchanged.
- pnpm scripts replace a Makefile, so the workflow also works on Windows.
- pnpm blocks dependency install scripts unless they are explicitly allowed in `pnpm-workspace.yaml`.

## Alternatives considered

- **NestJS 11 + CommonJS + Jest.** Matches the specification literally, but starts a new project on the previous major and the legacy module system.
- **TypeScript 7.** Faster builds, but it breaks linting and OpenAPI generation today.

## Consequences

- One root `vitest.config.ts` defines a `unit` and an `integration` project.
- When typescript-eslint and NestJS support TypeScript 7, upgrading is a deliberate change with its own ADR.
