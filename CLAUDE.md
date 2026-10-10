# CLAUDE.md

Guidance for AI assistants working in this repository.

## Start of every session

1. Read `PROGRESS.md`: current week, branch, next unchecked segment, open items.
2. Confirm the branch with `git branch --show-current`.
3. Run `pnpm verify` before changing anything; `pnpm test:int` needs Docker running.

## Working rules

- **Never commit, push or open PRs.** The owner does that. Leave all changes uncommitted.
- **One branch per roadmap week**, created from up-to-date `main` (`week-N/<slug>`).
- After finishing each segment, update `PROGRESS.md`: segment status, decisions/deviations, session log, next steps.
- Follow the specification (`High_Concurrency_Inventory_Reservation_Project_Specification_NestJS_Updated.md`). Record any deviation in `PROGRESS.md`, and in an ADR (`docs/decisions/`) when it is significant.
- Keep it lean: add a tool or pattern only when it solves a real problem, and add infrastructure in the week it is first used (spec Section 44).

## Architecture conventions

- Modules live in `apps/api/src/modules/<name>/`, layered as `domain/`, `application/`, `infrastructure/`, `interface/`, plus `<name>.module.ts` (composition root) and `public-api.ts`.
- `domain/` and `application/` import only their own module and `@stockforge/shared-kernel`: no NestJS, Prisma or Zod. Use cases are plain classes wired with factory providers in the module file.
- Other modules are reached only through their `public-api.ts`. A module defines the ports it needs; the module file wires them.
- Expected business failures extend `DomainError` with a `code` and a `kind`; the HTTP status comes from the kind (ProblemDetailsFilter).
- API schemas live in `packages/contracts` (Zod) and are used through `@Body/@Query/@Param({ schema })` and `@ApiOkResponse({ standardSchema })`.
- Database changes are new migrations (`pnpm db:migrate:create`). Invariants Prisma cannot express go into the migration SQL.
- ESM everywhere: relative imports end in `.js`.
- These rules are enforced by `pnpm arch:check` (dependency-cruiser).

## Testing conventions

- Unit tests live next to the code (`*.spec.ts`); integration tests in `apps/api/test/*.int-spec.ts`.
- Use in-memory fakes of ports for unit tests and real PostgreSQL (Testcontainers) for integration tests.
- Parse API responses with the contract schemas in integration tests.
- Domain and application layers have coverage thresholds (`pnpm test:cov`).
