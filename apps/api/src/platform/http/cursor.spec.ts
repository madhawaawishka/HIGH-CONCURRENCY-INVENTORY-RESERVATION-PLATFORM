import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { decodeCursor, encodeCursor } from './cursor.js';
import { RequestValidationError } from './request-validation.error.js';

const Position = z.object({ id: z.uuid() });
const id = '0199d1e2-7b3a-7000-8000-000000000001';

describe('pagination cursor', () => {
  it('round-trips a position', () => {
    expect(decodeCursor(encodeCursor({ id }), Position)).toEqual({ id });
  });

  it('produces URL-safe cursors', () => {
    expect(encodeCursor({ id })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['garbage', 'not-a-cursor'],
    ['valid base64 but not JSON', Buffer.from('hello').toString('base64url')],
    ['JSON with the wrong shape', encodeCursor({ id: 'not-a-uuid' })],
  ])('rejects %s as a validation error', (_case, cursor) => {
    expect(() => decodeCursor(cursor, Position)).toThrow(RequestValidationError);
  });
});
