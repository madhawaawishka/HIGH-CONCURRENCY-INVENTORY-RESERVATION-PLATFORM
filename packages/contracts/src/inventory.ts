import { z } from 'zod';

import { IsoDateTime, Uuid } from './common.js';

export const MAX_ADJUSTMENT = 1_000_000;

export const ProductIdParams = z.strictObject({ productId: Uuid });
export type ProductIdParams = z.infer<typeof ProductIdParams>;

export const AdjustStockRequest = z
  .strictObject({
    delta: z
      .int()
      .min(-MAX_ADJUSTMENT)
      .max(MAX_ADJUSTMENT)
      .refine((value) => value !== 0, { message: 'delta must not be zero' })
      .meta({
        description: 'Units to add (restock) or remove (write-off). Must not be zero.',
        example: 100,
      }),
    reason: z.string().trim().min(3).max(500).meta({ example: 'Restock from supplier PO-1042' }),
  })
  .meta({ id: 'AdjustStockRequest' });
export type AdjustStockRequest = z.infer<typeof AdjustStockRequest>;

/** Full stock breakdown, for administrators. Every unit is in exactly one bucket. */
export const StockLevelResponse = z
  .object({
    productId: Uuid,
    total: z.int().meta({ description: 'available + reserved + sold' }),
    available: z.int(),
    reserved: z.int(),
    sold: z.int(),
    updatedAt: IsoDateTime.nullable().meta({ description: 'Null if stock was never recorded.' }),
  })
  .meta({ id: 'StockLevel' });
export type StockLevelResponse = z.infer<typeof StockLevelResponse>;

/** Public availability. Informational only: the reservation call is authoritative. */
export const AvailabilityResponse = z
  .object({
    productId: Uuid,
    available: z.int(),
    inStock: z.boolean(),
  })
  .meta({ id: 'Availability' });
export type AvailabilityResponse = z.infer<typeof AvailabilityResponse>;
