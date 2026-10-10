import type { AuditLog } from '@stockforge/shared-kernel';

import type { Product } from '../domain/product.js';

export interface ProductPage {
  readonly items: readonly Product[];
  /** True when at least one more product exists after the last item. */
  readonly hasMore: boolean;
}

export interface ProductPageRequest {
  readonly limit: number;
  /** Id of the last product on the previous page (keyset pagination). */
  readonly afterId?: string;
}

/** Port: persistence of catalog products. */
export interface ProductRepository {
  /** @throws DuplicateSkuError when the SKU is already taken. */
  add(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  /** Products ordered newest first. */
  listNewestFirst(request: ProductPageRequest): Promise<ProductPage>;
  exists(id: string): Promise<boolean>;
}

export interface CatalogTransaction {
  readonly products: ProductRepository;
  readonly auditLog: AuditLog;
}

/** Port: runs work atomically; everything done through `tx` commits or rolls back together. */
export interface CatalogUnitOfWork {
  run<T>(work: (tx: CatalogTransaction) => Promise<T>): Promise<T>;
}
