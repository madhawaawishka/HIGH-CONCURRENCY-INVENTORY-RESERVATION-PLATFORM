import { z } from 'zod';

import { IsoDateTime, Money, Uuid } from './common.js';
import { pageOf } from './pagination.js';

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,63}$/;

export const Sku = z.string().regex(SKU_PATTERN).meta({
  description: 'Stock keeping unit: 3–64 uppercase letters, digits or dashes.',
  example: 'SNEAKER-RED-42',
});

export const ProductStatus = z.enum(['ACTIVE', 'INACTIVE']);
export type ProductStatus = z.infer<typeof ProductStatus>;

/** Largest unit price the database column (32-bit integer of minor units) can hold. */
export const MAX_PRICE_MINOR = 2_147_483_647;

export const CreateProductRequest = z
  .strictObject({
    sku: Sku,
    name: z.string().trim().min(1).max(200).meta({ example: 'Limited Edition Sneaker' }),
    price: z.strictObject({
      amountMinor: z.int().min(1).max(MAX_PRICE_MINOR).meta({ example: 12999 }),
      currency: Money.shape.currency,
    }),
  })
  .meta({ id: 'CreateProductRequest' });
export type CreateProductRequest = z.infer<typeof CreateProductRequest>;

export const ProductResponse = z
  .object({
    id: Uuid,
    sku: Sku,
    name: z.string(),
    price: Money,
    status: ProductStatus,
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
  })
  .meta({ id: 'Product' });
export type ProductResponse = z.infer<typeof ProductResponse>;

export const ProductPageResponse = pageOf(ProductResponse).meta({ id: 'ProductPage' });
export type ProductPageResponse = z.infer<typeof ProductPageResponse>;
