# StockForge — High-Concurrency Inventory & Reservation Platform

How do you safely sell scarce inventory when thousands of requests compete for it at once, without overselling, duplicating orders or losing events?

StockForge is a backend engineering project built around that question: correctness under concurrency, transactional integrity, reliable asynchronous processing and measured performance. The full plan is in the [project specification](High_Concurrency_Inventory_Reservation_Project_Specification_NestJS_Updated.md).

> **Status:** Week 1 of 6 (foundation) is complete. See [PROGRESS.md](PROGRESS.md) for the week-by-week tracker.

## What works today

| Endpoint                                          | Purpose                                                      |
| :------------------------------------------------ | :----------------------------------------------------------- |
| `GET /v1/products`                                | List products, newest first, with keyset (cursor) pagination |
| `GET /v1/products/:id`                            | Product details                                              |
| `GET /v1/products/:productId/availability`        | Public availability                                          |
| `POST /v1/admin/products`                         | Create a product (admin)                                     |
| `GET /v1/admin/inventory/:productId`              | Full stock breakdown (admin)                                 |
| `POST /v1/admin/inventory/:productId/adjustments` | Restock or write off units (admin, optimistic concurrency)   |

Interactive OpenAPI documentation is served at `/docs` (raw document at `/docs/openapi.json`). It is generated from the same Zod schemas that validate requests.

## Quick start

Prerequisites: Node.js 24, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env    # then set ADMIN_API_KEY to a long random value
pnpm bootstrap          # starts PostgreSQL, generates the Prisma client, migrates, seeds
pnpm dev                # http://localhost:3000/v1/products  ·  docs at /docs
```

Admin endpoints require the `X-Admin-Api-Key` header. This is an interim measure: JWT authentication replaces it in Week 2.

## Engineering highlights (Week 1)

- **Modular monolith with enforced boundaries.** Each module is layered (`domain` → `application` → `infrastructure` / `interface`). The domain and application layers are plain TypeScript, and dependency-cruiser fails the build if a layer or module boundary is crossed ([ADR-0001](docs/decisions/0001-modular-monolith-with-workers.md)).
- **Invariants enforced twice.** Stock rules live in the domain model and also as PostgreSQL `CHECK` constraints, the last line of defense ([ADR-0002](docs/decisions/0002-postgresql-source-of-truth.md)).
- **Optimistic concurrency.** Stock adjustments use compare-and-set on a version column, with bounded, jittered retries. An integration test fires 20 concurrent adjustments and proves that no update is lost.
- **One contract, three uses.** Zod schemas drive request validation, TypeScript types and the OpenAPI document ([ADR-0005](docs/decisions/0005-api-contracts-and-errors.md)).
- **Consistent errors.** Every error is RFC 9457 Problem Details with a stable `code` and the `X-Request-Id`.
- **Explicit state machine.** Order statuses can change only through a transition table, and every legal and illegal transition is tested.
- **Real dependencies in tests.** Integration tests run against PostgreSQL in Testcontainers, using the real migrations.

## Repository layout

```text
apps/api/                 NestJS API (modular monolith)
  src/modules/<module>/   domain/ application/ infrastructure/ interface/ + public-api.ts
  src/platform/           config, database, HTTP (errors, request ids, OpenAPI), audit
  test/                   integration tests (Testcontainers + Supertest)
packages/shared-kernel/   framework-free primitives: errors, clock, UUIDv7, money, retry
packages/contracts/       Zod API schemas (validation, types, OpenAPI)
packages/database/        Prisma schema, migrations (with CHECK constraints), seed, client
docs/decisions/           Architecture Decision Records
```

## Scripts

| Command                       | What it does                                                                |
| :---------------------------- | :-------------------------------------------------------------------------- |
| `pnpm dev`                    | Compile in watch mode and run the API with auto-restart                     |
| `pnpm verify`                 | All fast quality gates: format, lint, types, architecture rules, unit tests |
| `pnpm test` / `pnpm test:cov` | Unit tests / with coverage thresholds for domain and application code       |
| `pnpm test:int`               | Integration tests against a real PostgreSQL container (requires Docker)     |
| `pnpm build`                  | Generate the Prisma client and build every workspace (`tsc -b`)             |
| `pnpm bootstrap`              | Start PostgreSQL, migrate and seed                                          |
| `pnpm db:migrate:create`      | Create a new migration from `schema.prisma` changes                         |

## Quality gates

Every pull request runs: formatting, ESLint (strict, type-aware), TypeScript strict mode, architecture rules, unit tests with coverage thresholds, migrations against an empty database plus a drift check, integration tests, a build, and CodeQL. Commits follow [Conventional Commits](https://www.conventionalcommits.org) (enforced by a commit hook).

## Documentation

- [Project specification](High_Concurrency_Inventory_Reservation_Project_Specification_NestJS_Updated.md): architecture, roadmap, Definition of Done
- [Architecture Decision Records](docs/decisions/README.md)
- [Progress tracker](PROGRESS.md)
