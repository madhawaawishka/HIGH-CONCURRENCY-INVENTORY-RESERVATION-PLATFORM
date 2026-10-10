import { setTimeout as sleep } from 'node:timers/promises';

export interface RetryOptions {
  /** Total number of attempts, including the first one. */
  readonly attempts: number;
  /** Returns true for transient failures. Any other error is rethrown immediately. */
  readonly shouldRetry: (error: unknown) => boolean;
  /** Base delay for exponential backoff with full jitter. 0 retries immediately. */
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  /** Injectable for deterministic tests. */
  readonly random?: () => number;
  readonly wait?: (milliseconds: number) => Promise<unknown>;
}

/**
 * "Full jitter" backoff: a random delay between 0 and an exponentially growing ceiling.
 * Randomness stops many clients that failed together from retrying together.
 */
export function fullJitterDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(random() * ceiling);
}

/** Runs an operation with a bounded number of attempts; never retries forever. */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    attempts,
    shouldRetry,
    baseDelayMs = 0,
    maxDelayMs = 1_000,
    random = Math.random,
    wait = sleep,
  } = options;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }
      const delay = fullJitterDelay(attempt, baseDelayMs, maxDelayMs, random);
      if (delay > 0) {
        await wait(delay);
      }
    }
  }
}
