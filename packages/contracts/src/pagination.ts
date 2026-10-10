import { z } from 'zod';

export const MAX_PAGE_SIZE = 100;

/**
 * Keyset (cursor) pagination. The cursor is opaque to clients: it encodes the position of the
 * last item returned, so pages stay stable under concurrent inserts and never use OFFSET.
 * Unknown query parameters (e.g. cache-busters) are ignored; bodies, by contrast, are strict.
 */
export const PageQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(20)
    .meta({ description: `Page size (1–${MAX_PAGE_SIZE}).` }),
  cursor: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .meta({ description: 'Opaque cursor from the previous page.' }),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const PageInfo = z.object({
  limit: z.int(),
  nextCursor: z
    .string()
    .nullable()
    .meta({ description: 'Cursor for the next page; null on the last page.' }),
});
export type PageInfo = z.infer<typeof PageInfo>;

export function pageOf<Item extends z.ZodType>(item: Item) {
  return z.object({ data: z.array(item), page: PageInfo });
}
