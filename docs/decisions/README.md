# Architecture Decision Records

Each significant decision is recorded as a short ADR ([MADR](https://adr.github.io/madr/) style): the context, the decision, the alternatives considered and the consequences. ADRs are immutable once accepted; a changed decision gets a new ADR that supersedes the old one.

| ADR                                              | Decision                                                                       | Status   |
| :----------------------------------------------- | :----------------------------------------------------------------------------- | :------- |
| [0001](0001-modular-monolith-with-workers.md)    | Modular monolith with separately runnable workers                              | Accepted |
| [0002](0002-postgresql-source-of-truth.md)       | PostgreSQL is the source of truth; invariants are enforced in the database too | Accepted |
| [0003](0003-prisma-and-parameterized-sql.md)     | Prisma for data access, parameterized SQL for critical paths                   | Accepted |
| [0004](0004-toolchain.md)                        | Toolchain: pnpm workspaces, TypeScript 6, NestJS 12 (ESM), Vitest              | Accepted |
| [0005](0005-api-contracts-and-errors.md)         | API contracts from Zod schemas; RFC 9457 errors                                | Accepted |
| [0006](0006-uuidv7-ids-and-keyset-pagination.md) | Application-generated UUIDv7 ids and keyset pagination                         | Accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: Proposed | Accepted | Superseded by ADR-NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Alternatives considered

## Consequences
```
