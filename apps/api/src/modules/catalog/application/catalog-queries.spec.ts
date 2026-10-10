import { Money } from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { ProductNotFoundError } from '../domain/catalog.errors.js';
import { Product } from '../domain/product.js';
import { CatalogFacadeService } from './catalog-facade.js';
import { GetProductHandler } from './get-product.handler.js';
import { ListProductsHandler } from './list-products.handler.js';
import type { ProductPageRequest, ProductRepository } from './ports.js';

const product = Product.create({
  id: '0199d1e2-7b3a-7000-8000-000000000001',
  sku: 'SNEAKER-RED-42',
  name: 'Limited Edition Sneaker',
  price: Money.of(12_999, 'USD'),
  now: new Date('2026-10-10T12:00:00.000Z'),
});

function repositoryWith(products: readonly Product[]) {
  const pageRequests: ProductPageRequest[] = [];
  const repository: ProductRepository = {
    add: () => Promise.resolve(),
    findById: (id) => Promise.resolve(products.find((p) => p.id === id) ?? null),
    listNewestFirst: (request) => {
      pageRequests.push(request);
      return Promise.resolve({ items: products, hasMore: false });
    },
    exists: (id) => Promise.resolve(products.some((p) => p.id === id)),
  };
  return { repository, pageRequests };
}

describe('GetProductHandler', () => {
  it('returns an existing product', async () => {
    const { repository } = repositoryWith([product]);

    await expect(new GetProductHandler(repository).execute(product.id)).resolves.toBe(product);
  });

  it('raises ProductNotFoundError for an unknown id', async () => {
    const { repository } = repositoryWith([]);

    await expect(new GetProductHandler(repository).execute(product.id)).rejects.toThrow(
      ProductNotFoundError,
    );
  });
});

describe('ListProductsHandler', () => {
  it('passes the page request to the repository', async () => {
    const { repository, pageRequests } = repositoryWith([product]);

    const page = await new ListProductsHandler(repository).execute({ limit: 10, afterId: 'x' });

    expect(page.items).toEqual([product]);
    expect(pageRequests).toEqual([{ limit: 10, afterId: 'x' }]);
  });
});

describe('CatalogFacadeService', () => {
  it('tells other modules whether a product exists', async () => {
    const facade = new CatalogFacadeService(repositoryWith([product]).repository);

    await expect(facade.productExists(product.id)).resolves.toBe(true);
    await expect(facade.productExists('0199d1e2-7b3a-7000-8000-0000000000ff')).resolves.toBe(false);
  });
});
