import type { ProductRepository } from './ports.js';

/** Read-only view of the catalog offered to other modules. */
export interface CatalogFacade {
  productExists(productId: string): Promise<boolean>;
}

export const CATALOG_FACADE = Symbol('CATALOG_FACADE');

export class CatalogFacadeService implements CatalogFacade {
  constructor(private readonly products: ProductRepository) {}

  productExists(productId: string): Promise<boolean> {
    return this.products.exists(productId);
  }
}
