# ADR-0002: PostgreSQL is the source of truth; invariants are enforced in the database too

- Status: Accepted
- Date: 2026-10-10

## Context

Overselling is the failure this system exists to prevent. Inventory quantities must stay correct under concurrent writes, process crashes and application bugs. Redis will be used for caching and rate limiting later, but it is not durable or transactional enough to be the authority for stock.

## Decision

- PostgreSQL holds all inventory, reservation, order and idempotency state. Redis never decides a stock write.
- Inventory uses one canonical model: `total = available + reserved + sold`, with no negative bucket.
- The invariants are checked twice: in the domain model (`StockLevel`), which gives clear errors, and as `CHECK` constraints in the database (`inventory_balanced`, `inventory_non_negative`), which are the last line of defense.
- Integration tests prove the constraints reject invalid rows, even when they are written with raw SQL.

## Alternatives considered

- **Application checks only.** Simpler migrations, but a single bug or a manual SQL fix can corrupt stock silently.
- **Redis as the inventory counter.** Fast atomic decrements, but durability and consistency with orders would need extra machinery, and a cache failure would become a correctness failure.

## Consequences

- If a CHECK constraint ever fires in production, it is treated as a bug signal, not an expected error (it surfaces as a 500 and an alert).
- Hot products contend on one inventory row. This is measured in Week 2 and mitigations are explored as stretch goals.
