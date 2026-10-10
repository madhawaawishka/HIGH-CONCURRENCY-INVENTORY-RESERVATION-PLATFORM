# ADR-0005: API contracts from Zod schemas; RFC 9457 errors

- Status: Accepted
- Date: 2026-10-10

## Context

Request validation, TypeScript types and API documentation tend to drift apart when they are maintained separately. Clients also need one predictable error format. `nestjs-zod`, the usual bridge between Zod and NestJS, does not support NestJS 12.

## Decision

- Request and response schemas are written once, in Zod, in `@stockforge/contracts`.
- NestJS 12 validates them natively through Standard Schema: `@Body({ schema })`, `@Query({ schema })` and `@Param({ schema })`, with a global `StandardSchemaValidationPipe`. `@nestjs/swagger` 12 turns the same schemas into the OpenAPI document. No glue library is needed.
- Request bodies are strict: unknown fields are rejected, which also prevents mass assignment. Query strings ignore unknown parameters such as cache-busters.
- Every error is RFC 9457 Problem Details (`application/problem+json`), extended with a stable `code` and the `requestId`:
  - schema validation failure → **400**, with field-level `errors`
  - domain rule violated by well-formed input → **422**
  - state conflict (duplicate SKU, insufficient stock, concurrent modification) → **409**
  - unknown resource → **404**; missing or invalid credentials → **401**
  - body too large → **413**; unexpected failure → **500**, with details logged and never returned
- Domain errors declare a semantic `kind` (`invalid`, `not_found`, `conflict`, `forbidden`), and one exception filter maps the kind to a status, so the domain never knows about HTTP.
- URI versioning (`/v1`) and keyset pagination (see ADR-0006).

## Alternatives considered

- **class-validator DTOs.** The NestJS classic, but validation rules and types would be duplicated from the contracts.
- **`nestjs-zod`.** Not compatible with NestJS 12.
- **Ad-hoc error bodies.** Simpler at first, but every client then has to special-case each endpoint.

## Consequences

- The integration tests parse responses with the contract schemas, so a response that drifts from its contract fails CI.
- Admin endpoints are protected by an interim API-key guard (constant-time comparison) until JWT authentication replaces it in Week 2.
