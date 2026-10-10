# ADR-0003: Prisma for data access, parameterized SQL for critical paths

- Status: Accepted
- Date: 2026-10-10

## Context

Most data access is ordinary CRUD, where a type-safe client and managed migrations save time. The critical inventory paths need precise SQL: conditional updates, row locks, lock timeouts and query-plan experiments. Some invariants (CHECK constraints, partial indexes) cannot be expressed in Prisma's schema language.

## Decision

- Use **Prisma 7.10** (the latest stable line) with the `prisma-client` generator and the `@prisma/adapter-pg` driver adapter. The `prisma` CLI's `latest` tag currently points to an 8.0 release candidate, which is not used.
- Keep the schema, migrations, seed and client factory in a shared workspace package, `@stockforge/database`, because the API and every worker need the same generated client.
- Write CHECK constraints and partial indexes as hand-written SQL inside migration files, and verify in CI that migrations apply to an empty database and match `schema.prisma` (`prisma migrate diff --exit-code`).
- Use parameterized SQL (`$queryRaw` tagged templates, never string concatenation) where locking or query shape matters (Week 2 onward).
- Size the connection pool explicitly per process (`DATABASE_POOL_MAX`) rather than relying on driver defaults.
- Repositories translate Prisma error codes (e.g. P2002 unique violation) into domain errors, so no caller depends on Prisma.

## Alternatives considered

- **Raw SQL only.** Full control, but no generated types or migration tooling, and more boilerplate for simple queries.
- **TypeORM or Drizzle.** Viable, but Prisma's migration workflow and generated types fit the project. Critical paths use SQL anyway.

## Consequences

- Prisma 7 does not load `.env` itself, so `prisma.config.ts` loads the repository-root `.env` explicitly.
- Two styles of data access exist; the boundary (Prisma for CRUD, SQL for critical paths) is documented here.
