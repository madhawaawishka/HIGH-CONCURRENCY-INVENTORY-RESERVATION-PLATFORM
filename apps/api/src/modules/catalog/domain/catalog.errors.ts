import { DomainError } from '@stockforge/shared-kernel';

export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';
  readonly kind = 'not_found';

  constructor(productId: string) {
    super(`Product ${productId} does not exist.`, { productId });
  }
}

export class DuplicateSkuError extends DomainError {
  readonly code = 'SKU_ALREADY_EXISTS';
  readonly kind = 'conflict';

  constructor(sku: string) {
    super(`A product with SKU ${sku} already exists.`, { sku });
  }
}

export class InvalidSkuError extends DomainError {
  readonly code = 'INVALID_SKU';
  readonly kind = 'invalid';

  constructor(sku: string) {
    super(`"${sku}" is not a valid SKU: use 3–64 uppercase letters, digits or dashes.`, { sku });
  }
}
