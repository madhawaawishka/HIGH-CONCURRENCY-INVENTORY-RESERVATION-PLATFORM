import type { AuditLog } from '@stockforge/shared-kernel';

import type { StockLevel } from '../domain/stock-level.js';

/**
 * Another writer changed the stock level between our read and our write (optimistic lock lost).
 * Transient by nature: the operation can be retried against the fresh state.
 */
export class StockLevelConflictError extends Error {
  constructor(productId: string) {
    super(`Stock level of product ${productId} changed concurrently.`);
    this.name = 'StockLevelConflictError';
  }
}

/** Port: persistence of stock levels. */
export interface StockLevelRepository {
  find(productId: string): Promise<StockLevel | null>;
  /** Stores stock recorded for the first time. @throws StockLevelConflictError if another writer was first. */
  insert(stock: StockLevel): Promise<void>;
  /** @throws StockLevelConflictError if the stored version is no longer `expectedVersion`. */
  update(stock: StockLevel, expectedVersion: number): Promise<void>;
}

export interface InventoryTransaction {
  readonly stock: StockLevelRepository;
  readonly auditLog: AuditLog;
}

/** Port: runs work atomically; everything done through `tx` commits or rolls back together. */
export interface InventoryUnitOfWork {
  run<T>(work: (tx: InventoryTransaction) => Promise<T>): Promise<T>;
}

/**
 * What Inventory needs from the Catalog, defined by Inventory itself (dependency inversion).
 * The module wiring satisfies it with the Catalog module's public facade.
 */
export interface ProductCatalog {
  productExists(productId: string): Promise<boolean>;
}
