# StockForge — Build Progress Tracker

This file is the single source of truth for **where the build is**. Read it before starting work and update it after every segment, so any session (human or AI) can resume exactly where the last one stopped.

- **Specification:** [High_Concurrency_Inventory_Reservation_Project_Specification_NestJS_Updated.md](High_Concurrency_Inventory_Reservation_Project_Specification_NestJS_Updated.md) (roadmap: Section 37, Definition of Done: Section 38)
- **Architecture decisions:** [docs/decisions/](docs/decisions/)

## How to resume

1. Read **Current status** and the **Session log** (newest entry first).
2. Check out the branch listed for the current week (`git branch --show-current`).
3. Run the quality gates to confirm the tree is healthy: `pnpm install`, `pnpm verify`.
4. Continue with the first unchecked item of the current week.

## Working conventions

- One branch per roadmap week, created from up-to-date `main` (e.g. `week-1/foundation`).
- The assistant never commits, pushes or opens PRs; the owner reviews, commits (Conventional Commits) and opens PRs.
- A segment is **done** only when its code, tests and docs exist and `pnpm verify` passes.
- Infrastructure is added in the week it is first used (keep it lean; see spec Section 44).
- Deviations from the spec are recorded in **Decisions and deviations** below and, when significant, as an ADR.

## Current status

| Item         | Value                                                         |
| :----------- | :------------------------------------------------------------ |
| Current week | Week 1 — Foundation                                           |
| Branch       | `week-1/foundation`                                           |
| State        | Complete; waiting for the owner to commit, push and open a PR |
| Next         | Week 2, on branch `week-2/reservations` from updated `main`   |
| Last updated | 2026-10-10                                                    |

## Roadmap overview

| Week | Theme                                                                                        | Branch                | Status      |
| :--- | :------------------------------------------------------------------------------------------- | :-------------------- | :---------- |
| 1    | Foundation: monorepo, tooling, CI, config, database, errors, OpenAPI, catalog/inventory APIs | `week-1/foundation`   | Complete    |
| 2    | Reservations, concurrency strategies, concurrency tests, authentication                      | `week-2/reservations` | Not started |
| 3    | Indexes, EXPLAIN ANALYZE, pagination, pools, Redis cache, idempotency, rate limiting         | `week-3/...`          | Not started |
| 4    | Kafka, outbox, inbox, retries/DLQ, expiry worker, checkout saga, reconciliation              | `week-4/...`          | Not started |
| 5    | Logs, tracing, metrics, health/shutdown, SLOs, load and failure testing                      | `week-5/...`          | Not started |
| 6    | Hardening, scaling benchmark, diagrams, README, ADRs, resume material                        | `week-6/...`          | Not started |
| 7–8  | Optional stretch goals (spec Section 43)                                                     | —                     | Not started |

---

## Week 1 — Foundation

Goal (spec Section 37): running product/inventory/order modules with basic tests and green CI.

| #     | Segment                                                                                                                                          | Status |
| :---- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| W1.1  | Repository foundation: pnpm workspace, strict TypeScript, ESLint, Prettier, EditorConfig, Git attributes, Husky + lint-staged + commitlint       | ✅     |
| W1.2  | Shared packages: `shared-kernel` (domain errors, clock, UUIDv7 ids, money, retry) and `contracts` (Zod API schemas)                              | ✅     |
| W1.3  | Database package: Prisma 7 schema, initial migration with CHECK constraints, client factory, dev seed, Docker Compose PostgreSQL                 | ✅     |
| W1.4  | API platform: bootstrap, validated config, request IDs, Problem Details errors, Zod validation, OpenAPI, database module, admin guard, audit log | ✅     |
| W1.5  | Catalog module (domain → application → infrastructure → interface) with unit tests                                                               | ✅     |
| W1.6  | Inventory module (stock levels, availability, stock adjustments) with unit tests                                                                 | ✅     |
| W1.7  | Orders domain: order state machine with table-driven tests                                                                                       | ✅     |
| W1.8  | Architecture rules enforced with dependency-cruiser                                                                                              | ✅     |
| W1.9  | Integration tests against real PostgreSQL (Testcontainers + Supertest)                                                                           | ✅     |
| W1.10 | CI: GitHub Actions (quality, migrations, integration, build), CodeQL, Dependabot, PR template                                                    | ✅     |
| W1.11 | Documentation: ADRs, README, CLAUDE.md                                                                                                           | ✅     |
| W1.12 | Full verification of all quality gates                                                                                                           | ✅     |

**Week 1 evidence (2026-10-10, local run):**

- Format, ESLint (strict, type-aware), TypeScript strict and architecture rules: all clean.
- 110 unit tests pass; coverage thresholds for domain (≥ 90% lines), application (≥ 85%) and shared kernel (≥ 90%) are met.
- 24 integration tests pass against PostgreSQL 18.6 (Testcontainers). They include 20 concurrent stock adjustments with no lost update, concurrent duplicate SKUs (exactly one 201), CHECK constraints rejecting invalid rows, keyset pagination and the OpenAPI document.
- Migrations apply to an empty database with no drift (`prisma migrate diff --exit-code`); the seed is idempotent.
- A clean `tsc -b` build succeeds, and `pnpm bootstrap` and `pnpm dev` work end to end.
- Bug found by smoke testing and fixed: oversized request bodies returned 500 instead of 413. A regression test now covers it.
- Not yet verified: the GitHub Actions run itself. It happens on the first push/PR.

**Spec items intentionally moved to later weeks:** structured Pino logging and health endpoints (Week 5), Dockerfile and `helmet` hardening (Week 6), large-dataset seed (Week 3), order persistence and endpoints (Week 2, with authentication and reservations).

## Week 2 — Reservations and concurrency (planned)

- Users table, authentication (JWT) and roles; replace the interim admin API-key guard; ownership checks.
- Reservation domain and state machine; reservations/orders persistence.
- Naive, pessimistic, optimistic and atomic-update strategies behind one `ReservationStrategy` interface.
- Lock timeouts, retryable PostgreSQL error handling.
- Concurrency tests against multiple API instances; property-based invariant tests (fast-check).

## Week 3 — Database performance, caching, idempotency (planned)

- Deterministic large-dataset seed; index experiments with EXPLAIN ANALYZE; keyset pagination evidence.
- Connection-pool tuning; Redis (added to Docker Compose) cache-aside with stampede protection.
- DB-backed idempotency; rate limiting and reservation limits.

## Week 4 — Reliable asynchronous workflow (planned)

- Kafka (added to Docker Compose), event envelope and contracts; outbox relay; consumers with inbox deduplication.
- Retries with backoff and DLQ; reservation-expiry worker; checkout saga with payment-after-expiry compensation; reconciliation job.

## Week 5 — Observability and failure testing (planned)

- Pino logs, OpenTelemetry, Prometheus/Grafana/Jaeger (added to Docker Compose); health checks and graceful shutdown.
- SLOs, alert rules, runbooks; k6 scenarios with correctness assertions; failure injection; one postmortem.

## Week 6 — Portfolio readiness (planned)

- Dockerfiles and image hardening; multi-instance scaling benchmark; C4 and sequence diagrams; final README; resume bullets.

---

## Decisions and deviations from the spec

| Date       | Decision                                                                                             | Why                                                                                                       | Record   |
| :--------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :------- |
| 2026-10-10 | TypeScript 6.0 instead of 7.0                                                                        | TypeScript 7 (native compiler) is not yet supported by typescript-eslint, @nestjs/swagger or the Nest CLI | ADR-0004 |
| 2026-10-10 | NestJS 12 as ESM, tested with Vitest instead of Jest                                                 | NestJS 12 ships ESM-only; Vitest is Nest's default for ESM projects, Jest's ESM support is experimental   | ADR-0004 |
| 2026-10-10 | Zod validation through Nest 12's built-in Standard Schema support, not `nestjs-zod`                  | `nestjs-zod` does not support NestJS 12; the framework now validates Standard Schema natively             | ADR-0005 |
| 2026-10-10 | Prisma 7.10 (stable) instead of the 8.0 release candidate                                            | The `prisma` CLI's `latest` tag currently points to an RC                                                 | ADR-0003 |
| 2026-10-10 | Prisma lives in a `packages/database` workspace package instead of a root `prisma/` folder           | The API and every worker import the same generated client and migrations                                  | ADR-0004 |
| 2026-10-10 | pnpm scripts instead of a Makefile                                                                   | Cross-platform (`make` is not available on Windows by default)                                            | —        |
| 2026-10-10 | Redis, Kafka and the observability stack are added to Docker Compose in the week they are first used | Keep each week lean; no unused infrastructure                                                             | —        |
| 2026-10-10 | Admin endpoints use an interim API-key guard in Week 1                                               | Authentication (JWT + roles) is scheduled for Week 2; admin writes must not be open meanwhile             | —        |
| 2026-10-10 | Domain-rule violations return 422; schema validation failures return 400                             | Separates malformed requests from well-formed requests that break a business rule                         | ADR-0005 |
| 2026-10-10 | Application-generated UUIDv7 ids; keyset pagination on the primary key                               | Ids known before insert, index-friendly, naturally time-ordered                                           | ADR-0006 |
| 2026-10-10 | Week 1 schema has only the tables Week 1 uses (products, inventory, audit_logs)                      | Each later week adds its tables as a new migration, which shows the schema evolving                       | —        |

## Open items for the owner

- Choose a license (the spec's folder structure lists `LICENSE`); not added because it is your legal decision.
- An older Docker volume `stockforge_postgres-data` and stopped containers `stockforge-redis-1` / `stockforge-kafka-1` exist from an earlier setup. The project now uses the volume `stockforge_pgdata`, so the old ones are untouched; remove them with `docker volume rm stockforge_postgres-data` and `docker rm stockforge-redis-1 stockforge-kafka-1` if you no longer need them.
- A PostgreSQL inside WSL listens on `[::1]:5432`. `DATABASE_URL` therefore uses `127.0.0.1` so it always reaches the Docker container.
- Commit messages must follow Conventional Commits (enforced by the `commit-msg` hook), e.g. `feat(inventory): add stock adjustments` or `chore: set up monorepo tooling`.
- CodeQL is free for public repositories. If the GitHub repository is private without Advanced Security, the CodeQL workflow will fail; make the repository public or remove `.github/workflows/codeql.yml`.
- After pushing, confirm the CI run is green, then protect `main` (require the CI checks to pass before merging).

## Session log

### 2026-10-10 — Session 2 (Week 1 completed)

- Built W1.3–W1.12: database package (verified against Docker PostgreSQL), API platform, Catalog and Inventory modules, Orders domain, architecture rules, integration tests, CI workflows, ADRs 0001–0006, README and CLAUDE.md.
- Resolved local environment conflicts without touching existing data: a separate Docker volume (`stockforge_pgdata`) and `127.0.0.1` in `DATABASE_URL` (see open items).
- Renamed the `setup` script to `bootstrap`, because `pnpm setup` is a built-in pnpm command.
- Next: the owner commits and opens the Week 1 PR. Then start Week 2 on `week-2/reservations` from the updated `main`, beginning with users and JWT authentication (it replaces the interim admin key) and the reservation domain.

### 2026-10-10 — Session 1

- Verified the toolchain (Node 24.19, pnpm 11.1, Docker 28) and current package versions; resolved compatibility (TypeScript 6, NestJS 12 ESM, Prisma 7.10, Vitest 5).
- Created branch `week-1/foundation` and this tracker.
- Next: W1.1 repository foundation.
