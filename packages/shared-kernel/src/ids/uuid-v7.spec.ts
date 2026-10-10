import { describe, expect, it } from 'vitest';

import { UuidV7Generator } from './uuid-v7.js';

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function timestampOf(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}

describe('UuidV7Generator', () => {
  it('produces RFC 9562 version-7 ids with the correct variant bits', () => {
    const id = new UuidV7Generator().next();

    expect(id).toMatch(UUID_V7_PATTERN);
  });

  it('encodes the current Unix-millisecond timestamp in the first 48 bits', () => {
    const now = Date.UTC(2026, 9, 10, 12, 0, 0);

    const id = new UuidV7Generator(() => now).next();

    expect(timestampOf(id)).toBe(now);
  });

  it('keeps ids strictly increasing when many are created in the same millisecond', () => {
    const generator = new UuidV7Generator(() => 1_700_000_000_000);

    const ids = Array.from({ length: 10_000 }, () => generator.next());

    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays monotonic when the system clock moves backwards', () => {
    const times = [2_000, 1_000, 1_000];
    const generator = new UuidV7Generator(() => times.shift() ?? 1_000);

    const ids = [generator.next(), generator.next(), generator.next()];

    expect([...ids].sort()).toEqual(ids);
  });
});
