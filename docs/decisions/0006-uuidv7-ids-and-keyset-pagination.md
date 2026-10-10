# ADR-0006: Application-generated UUIDv7 ids and keyset pagination

- Status: Accepted
- Date: 2026-10-10

## Context

Entities need ids that are safe to expose, unique across processes and generated without a database round trip, so that domain objects are complete before they are persisted. Random UUIDv4 primary keys scatter B-tree inserts and cannot be used to order results. OFFSET pagination gets slower as the offset grows, and it skips or repeats rows under concurrent inserts.

## Decision

- Ids are **UUIDv7** (RFC 9562), generated in the application by `UuidV7Generator` in the shared kernel. The generator is injected through an `IdGenerator` port, so tests can control ids. It is monotonic within a process: a 12-bit counter handles many ids in the same millisecond, and it also copes with the clock moving backwards.
- Because UUIDv7 sorts by creation time, lists use **keyset pagination** on the primary key (`WHERE id < :lastId ORDER BY id DESC LIMIT n + 1`). The cursor is opaque base64url JSON, so its encoding can change without breaking clients.

## Alternatives considered

- **Database-generated ids (sequence, or PostgreSQL 18 `uuidv7()`).** These need an insert before the id is known.
- **UUIDv4.** Random order: worse index locality and no natural sort.
- **OFFSET pagination.** Simple, but unstable under writes and O(offset) per page.

## Consequences

- Ordering across processes is by timestamp only (millisecond precision), which is acceptable for listing.
- Index experiments in Week 3 compare keyset and OFFSET pagination with `EXPLAIN ANALYZE`.
