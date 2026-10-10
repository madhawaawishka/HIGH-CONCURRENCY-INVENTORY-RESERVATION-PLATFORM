import type { ProductPageResponse, ProductResponse } from '@stockforge/contracts';

import { encodeCursor } from '../../../platform/http/cursor.js';
import type { ProductPage } from '../application/ports.js';
import type { Product } from '../domain/product.js';

/** Maps the domain model to the public contract; the domain never leaks into responses. */
export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    sku: product.sku.value,
    name: product.name,
    price: { amountMinor: product.price.amountMinor, currency: product.price.currency },
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductPageResponse(page: ProductPage, limit: number): ProductPageResponse {
  const last = page.items.at(-1);
  return {
    data: page.items.map(toProductResponse),
    page: {
      limit,
      nextCursor: page.hasMore && last !== undefined ? encodeCursor({ id: last.id }) : null,
    },
  };
}
