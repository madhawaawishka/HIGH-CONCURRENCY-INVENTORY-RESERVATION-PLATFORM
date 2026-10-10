import {
  ConcurrentModificationError,
  FixedClock,
  type AuditEntry,
} from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { InsufficientStockError, UnknownProductError } from '../domain/inventory.errors.js';
import { StockLevel } from '../domain/stock-level.js';
import { AdjustStockHandler, type AdjustStockCommand } from './adjust-stock.handler.js';
import {
  StockLevelConflictError,
  type InventoryTransaction,
  type InventoryUnitOfWork,
} from './ports.js';

const productId = '0199d1e2-7b3a-7000-8000-000000000001';

/** In-memory store with version checks; `conflictsToInject` simulates concurrent writers. */
class InMemoryInventory implements InventoryUnitOfWork {
  readonly levels = new Map<string, StockLevel>();
  readonly audit: AuditEntry[] = [];
  conflictsToInject = 0;

  async run<T>(work: (tx: InventoryTransaction) => Promise<T>): Promise<T> {
    const writes = new Map<string, StockLevel>();
    const auditEntries: AuditEntry[] = [];
    const conflict = () => {
      if (this.conflictsToInject > 0) {
        this.conflictsToInject -= 1;
        return true;
      }
      return false;
    };
    const result = await work({
      stock: {
        find: (id) => Promise.resolve(this.levels.get(id) ?? null),
        insert: (stock) => {
          if (conflict() || this.levels.has(stock.productId)) {
            return Promise.reject(new StockLevelConflictError(stock.productId));
          }
          writes.set(stock.productId, stock);
          return Promise.resolve();
        },
        update: (stock, expectedVersion) => {
          if (conflict() || this.levels.get(stock.productId)?.version !== expectedVersion) {
            return Promise.reject(new StockLevelConflictError(stock.productId));
          }
          writes.set(stock.productId, stock);
          return Promise.resolve();
        },
      },
      auditLog: { record: (entry) => Promise.resolve(void auditEntries.push(entry)) },
    });
    // Commit only when the work succeeded, like a database transaction.
    writes.forEach((stock, id) => this.levels.set(id, stock));
    this.audit.push(...auditEntries);
    return result;
  }
}

function setup({ productExists = true } = {}) {
  const inventory = new InMemoryInventory();
  const catalog = { productExists: () => Promise.resolve(productExists) };
  const handler = new AdjustStockHandler(
    inventory,
    catalog,
    new FixedClock(new Date('2026-10-10T12:00:00.000Z')),
  );
  return { inventory, handler };
}

const restock: AdjustStockCommand = {
  productId,
  delta: 100,
  reason: 'Initial stock',
  actorId: 'admin-api-key',
};

describe('AdjustStockHandler', () => {
  it('records stock for a product for the first time', async () => {
    const { inventory, handler } = setup();

    const level = await handler.execute(restock);

    expect(level).toMatchObject({ total: 100, available: 100, version: 1 });
    expect(inventory.levels.get(productId)).toBe(level);
  });

  it('writes an audit entry in the same unit of work', async () => {
    const { inventory, handler } = setup();

    await handler.execute(restock);

    expect(inventory.audit).toHaveLength(1);
    expect(inventory.audit[0]).toMatchObject({
      action: 'STOCK_ADJUSTED',
      aggregateId: productId,
      metadata: { delta: 100, availableBefore: 0, availableAfter: 100 },
    });
  });

  it('retries after losing an optimistic lock and then succeeds', async () => {
    const { inventory, handler } = setup();
    await handler.execute(restock);
    inventory.conflictsToInject = 2;

    const level = await handler.execute({ ...restock, delta: -30, reason: 'Damaged' });

    expect(level).toMatchObject({ available: 70, version: 2 });
  });

  it('gives up after bounded retries with a conflict error, writing nothing', async () => {
    const { inventory, handler } = setup();
    await handler.execute(restock);
    inventory.conflictsToInject = 3;

    await expect(handler.execute({ ...restock, delta: 5 })).rejects.toThrow(
      ConcurrentModificationError,
    );
    expect(inventory.levels.get(productId)?.available).toBe(100);
    expect(inventory.audit).toHaveLength(1);
  });

  it('refuses to write off more than is available', async () => {
    const { handler } = setup();
    await handler.execute(restock);

    await expect(handler.execute({ ...restock, delta: -101 })).rejects.toThrow(
      InsufficientStockError,
    );
  });

  it('rejects products that are not in the catalog', async () => {
    const { handler } = setup({ productExists: false });

    await expect(handler.execute(restock)).rejects.toThrow(UnknownProductError);
  });
});
