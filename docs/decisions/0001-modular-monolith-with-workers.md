# ADR-0001: Modular monolith with separately runnable workers

- Status: Accepted
- Date: 2026-10-10

## Context

The platform has a few business areas (catalog, inventory, orders, payments) and several kinds of background work (outbox relay, reservation expiry, consumers). The hard problems are correctness under concurrency, transactions and reliable asynchronous processing, not independent deployment of many services. Splitting into microservices early would replace local transactions with distributed ones before the core workflow is proven correct.

## Decision

Build one NestJS API as a **modular monolith**, plus background workers that run as separate processes from the same repository (added from Week 4).

- Each business module (`apps/api/src/modules/<name>`) is layered: `domain` → `application` → `infrastructure` / `interface`.
- `domain` and `application` are plain TypeScript with no NestJS or Prisma imports; the module file is the composition root.
- Modules talk to each other only through their `public-api.ts` (for example, Inventory uses Catalog's `CatalogFacade`). A module defines the ports it needs, and the wiring satisfies them (dependency inversion).
- These rules are enforced in CI by dependency-cruiser (`.dependency-cruiser.cjs`), not by convention alone.

## Alternatives considered

- **Microservices from day one.** Independent scaling and deployment, but distributed transactions, network failure modes and operational cost arrive before they are needed.
- **Unstructured monolith.** Fastest to start, but boundaries erode and later extraction becomes a rewrite.

## Consequences

- One transaction can still span modules where the business requires it, and that seam is explicit in an application-layer use case.
- Extracting a module later means replacing its in-process facade with a network client, and local transactions with a saga.
- Every process must be stateless, so the API can run as several instances behind a load balancer.
