import { describe, expect, it, vi } from 'vitest';

import { fullJitterDelay, retry } from './retry.js';

class TransientError extends Error {}
class PermanentError extends Error {}

const isTransient = (error: unknown): boolean => error instanceof TransientError;

describe('retry', () => {
  it('returns the first successful result', async () => {
    const operation = vi.fn().mockResolvedValue('ok');

    await expect(retry(operation, { attempts: 3, shouldRetry: isTransient })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures until an attempt succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new TransientError())
      .mockRejectedValueOnce(new TransientError())
      .mockResolvedValue('ok');

    await expect(retry(operation, { attempts: 3, shouldRetry: isTransient })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('gives up after the configured number of attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new TransientError());

    await expect(retry(operation, { attempts: 3, shouldRetry: isTransient })).rejects.toThrow(
      TransientError,
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry permanent failures', async () => {
    const operation = vi.fn().mockRejectedValue(new PermanentError());

    await expect(retry(operation, { attempts: 5, shouldRetry: isTransient })).rejects.toThrow(
      PermanentError,
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('waits a jittered delay between attempts', async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    const operation = vi.fn().mockRejectedValueOnce(new TransientError()).mockResolvedValue('ok');

    await retry(operation, {
      attempts: 2,
      shouldRetry: isTransient,
      baseDelayMs: 100,
      random: () => 0.5,
      wait,
    });

    expect(wait).toHaveBeenCalledWith(50);
  });
});

describe('fullJitterDelay', () => {
  it('grows the ceiling exponentially and caps it at the maximum', () => {
    const alwaysMax = () => 0.999_999;

    expect(fullJitterDelay(1, 100, 10_000, alwaysMax)).toBe(99);
    expect(fullJitterDelay(3, 100, 10_000, alwaysMax)).toBe(399);
    expect(fullJitterDelay(10, 100, 1_000, alwaysMax)).toBe(999);
  });
});
