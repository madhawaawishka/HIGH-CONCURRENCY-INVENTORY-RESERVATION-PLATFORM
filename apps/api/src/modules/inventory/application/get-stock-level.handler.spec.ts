import { describe, expect, it } from 'vitest';

import { UnknownProductError } from '../domain/inventory.errors.js';
import { StockLevel } from '../domain/stock-level.js';
import { GetStockLevelHandler } from './get-stock-level.handler.js';
import type { StockLevelRepository } from './ports.js';

const productId = '0199d1e2-7b3a-7000-8000-000000000001';

function handlerWith({ stored, inCatalog }: { stored: StockLevel | null; inCatalog: boolean }) {
  const stock: StockLevelRepository = {
    find: () => Promise.resolve(stored),
    insert: () => Promise.resolve(),
    update: () => Promise.resolve(),
  };
  return new GetStockLevelHandler(stock, { productExists: () => Promise.resolve(inCatalog) });
}

describe('GetStockLevelHandler', () => {
  it('returns the recorded stock level', async () => {
    const stored = StockLevel.empty(productId).adjust(5, new Date());

    await expect(handlerWith({ stored, inCatalog: true }).execute(productId)).resolves.toBe(stored);
  });

  it('reports zero stock for a catalog product whose stock was never recorded', async () => {
    const stock = await handlerWith({ stored: null, inCatalog: true }).execute(productId);

    expect(stock).toMatchObject({ productId, available: 0, isRecorded: false });
  });

  it('rejects products that are not in the catalog', async () => {
    await expect(
      handlerWith({ stored: null, inCatalog: false }).execute(productId),
    ).rejects.toThrow(UnknownProductError);
  });
});
