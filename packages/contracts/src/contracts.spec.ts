import { describe, expect, it } from 'vitest';

import { CreateProductRequest } from './catalog.js';
import { AdjustStockRequest } from './inventory.js';
import { PageQuery } from './pagination.js';

const validProduct = {
  sku: 'SNEAKER-RED-42',
  name: 'Limited Edition Sneaker',
  price: { amountMinor: 12_999, currency: 'USD' },
};

describe('CreateProductRequest', () => {
  it('accepts a valid product', () => {
    expect(CreateProductRequest.safeParse(validProduct).success).toBe(true);
  });

  it('rejects unknown fields to prevent mass assignment', () => {
    const result = CreateProductRequest.safeParse({ ...validProduct, status: 'INACTIVE' });

    expect(result.success).toBe(false);
  });

  it.each([['lowercase'], ['AB'], ['-LEADING-DASH'], ['HAS SPACE']])('rejects SKU %s', (sku) => {
    expect(CreateProductRequest.safeParse({ ...validProduct, sku }).success).toBe(false);
  });

  it('rejects a fractional or zero price', () => {
    for (const amountMinor of [0, 12.5]) {
      const result = CreateProductRequest.safeParse({
        ...validProduct,
        price: { amountMinor, currency: 'USD' },
      });
      expect(result.success).toBe(false);
    }
  });
});

describe('AdjustStockRequest', () => {
  it('rejects a zero delta', () => {
    expect(AdjustStockRequest.safeParse({ delta: 0, reason: 'noop' }).success).toBe(false);
  });

  it('accepts negative write-offs', () => {
    expect(AdjustStockRequest.safeParse({ delta: -5, reason: 'Damaged units' }).success).toBe(true);
  });
});

describe('PageQuery', () => {
  it('coerces the limit from a query string and defaults it', () => {
    expect(PageQuery.parse({ limit: '50' }).limit).toBe(50);
    expect(PageQuery.parse({}).limit).toBe(20);
  });

  it('caps the page size', () => {
    expect(PageQuery.safeParse({ limit: '1000' }).success).toBe(false);
  });
});
