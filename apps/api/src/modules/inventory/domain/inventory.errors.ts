import { DomainError } from '@stockforge/shared-kernel';

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly kind = 'conflict';

  constructor(productId: string, requested: number, available: number) {
    super(`Cannot take ${requested} units of product ${productId}: only ${available} available.`, {
      productId,
      requested,
      available,
    });
  }
}

/** Stock was requested for a product that is not in the catalog. */
export class UnknownProductError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';
  readonly kind = 'not_found';

  constructor(productId: string) {
    super(`Product ${productId} does not exist.`, { productId });
  }
}
