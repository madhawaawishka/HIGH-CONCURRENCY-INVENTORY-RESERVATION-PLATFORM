import { FixedClock, type AuditEntry } from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { DuplicateSkuError } from '../domain/catalog.errors.js';
import type { Product } from '../domain/product.js';
import { CreateProductHandler, type CreateProductCommand } from './create-product.handler.js';
import type {
  CatalogTransaction,
  CatalogUnitOfWork,
  ProductPage,
  ProductRepository,
} from './ports.js';

/** In-memory fake: rolls back on error just like a real transaction would. */
class InMemoryCatalog implements CatalogUnitOfWork {
  readonly products = new Map<string, Product>();
  readonly audit: AuditEntry[] = [];

  async run<T>(work: (tx: CatalogTransaction) => Promise<T>): Promise<T> {
    const staged = new Map(this.products);
    const stagedAudit: AuditEntry[] = [];
    const repository: ProductRepository = {
      add: (product) => {
        if ([...staged.values()].some((existing) => existing.sku.equals(product.sku))) {
          return Promise.reject(new DuplicateSkuError(product.sku.value));
        }
        staged.set(product.id, product);
        return Promise.resolve();
      },
      findById: (id) => Promise.resolve(staged.get(id) ?? null),
      listNewestFirst: () => Promise.resolve<ProductPage>({ items: [], hasMore: false }),
      exists: (id) => Promise.resolve(staged.has(id)),
    };
    const result = await work({
      products: repository,
      auditLog: { record: (entry) => Promise.resolve(void stagedAudit.push(entry)) },
    });
    staged.forEach((product, id) => this.products.set(id, product));
    this.audit.push(...stagedAudit);
    return result;
  }
}

const command: CreateProductCommand = {
  sku: 'SNEAKER-RED-42',
  name: 'Limited Edition Sneaker',
  priceMinor: 12_999,
  currency: 'USD',
  actorId: 'admin-api-key',
};

function setup() {
  const catalog = new InMemoryCatalog();
  let sequence = 0;
  const ids = { next: () => `00000000-0000-7000-8000-${String(++sequence).padStart(12, '0')}` };
  const clock = new FixedClock(new Date('2026-10-10T12:00:00.000Z'));
  return { catalog, handler: new CreateProductHandler(catalog, ids, clock) };
}

describe('CreateProductHandler', () => {
  it('stores the product and records who created it', async () => {
    const { catalog, handler } = setup();

    const product = await handler.execute(command);

    expect(catalog.products.get(product.id)).toBe(product);
    expect(catalog.audit).toEqual([
      expect.objectContaining({
        actorId: 'admin-api-key',
        action: 'PRODUCT_CREATED',
        aggregateId: product.id,
      }),
    ]);
  });

  it('rejects a duplicate SKU and writes nothing', async () => {
    const { catalog, handler } = setup();
    await handler.execute(command);

    await expect(handler.execute({ ...command, name: 'Copy' })).rejects.toThrow(DuplicateSkuError);
    expect(catalog.products.size).toBe(1);
    expect(catalog.audit).toHaveLength(1);
  });
});
