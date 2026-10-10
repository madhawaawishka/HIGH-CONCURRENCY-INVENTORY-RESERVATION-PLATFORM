import type { z } from 'zod';

import { RequestValidationError } from './request-validation.error.js';

/**
 * Keyset-pagination cursors are opaque to clients: base64url-encoded JSON describing the
 * position after which the next page starts. Clients cannot depend on the encoding, so it can
 * change (e.g. to add a sort column) without breaking the API.
 */
export function encodeCursor(position: Readonly<Record<string, string>>): string {
  return Buffer.from(JSON.stringify(position), 'utf8').toString('base64url');
}

/** Decodes and validates a cursor; a tampered or malformed cursor is a 400, not a 500. */
export function decodeCursor<T>(cursor: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw new RequestValidationError([{ path: 'cursor', message: 'Invalid pagination cursor.' }]);
  }
}
