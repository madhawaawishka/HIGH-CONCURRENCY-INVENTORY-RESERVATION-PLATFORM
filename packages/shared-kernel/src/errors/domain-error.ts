/**
 * Semantic category of a domain error. The HTTP layer maps a kind to a status code,
 * so domain code never needs to know about HTTP.
 */
export type DomainErrorKind = 'invalid' | 'not_found' | 'conflict' | 'forbidden';

/**
 * Base class for expected business-rule violations (e.g. insufficient stock).
 * Unexpected failures (database down, bugs) must not extend this class.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable identifier such as `PRODUCT_NOT_FOUND`. */
  abstract readonly code: string;
  abstract readonly kind: DomainErrorKind;

  protected constructor(
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised when a value object or entity receives input that violates its invariants. */
export class InvariantViolationError extends DomainError {
  readonly code = 'INVARIANT_VIOLATION';
  readonly kind = 'invalid';

  constructor(message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message, details);
  }
}

/** Raised when an optimistic-concurrency check keeps failing after bounded retries. */
export class ConcurrentModificationError extends DomainError {
  readonly code = 'CONCURRENT_MODIFICATION';
  readonly kind = 'conflict';

  constructor(resource: string, id: string) {
    super(`${resource} ${id} was modified concurrently; retry the request.`, { resource, id });
  }
}
