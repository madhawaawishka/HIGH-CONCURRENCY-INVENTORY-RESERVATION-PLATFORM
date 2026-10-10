import { InvariantViolationError, Money } from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { InvalidSkuError } from './catalog.errors.js';
import { Product, type NewProduct } from './product.js';
import { Sku } from './sku.js';

const now = new Date('2026-10-10T12:00:00.000Z');

const newProduct = (overrides: Partial<NewProduct> = {}): NewProduct => ({
  id: '0199d1e2-7b3a-7000-8000-000000000001',
  sku: 'SNEAKER-RED-42',
  name: 'Limited Edition Sneaker',
  price: Money.of(12_999, 'USD'),
  now,
  ...overrides,
});

describe('Product.create', () => {
  it('creates an active product with matching created/updated timestamps', () => {
    const product = Product.create(newProduct());

    expect(product.status).toBe('ACTIVE');
    expect(product.sku.value).toBe('SNEAKER-RED-42');
    expect(product.createdAt).toEqual(now);
    expect(product.updatedAt).toEqual(now);
  });

  it('trims the name', () => {
    expect(Product.create(newProduct({ name: '  Hoodie  ' })).name).toBe('Hoodie');
  });

  it.each([[''], ['   '], ['x'.repeat(201)]])('rejects the name %j', (name) => {
    expect(() => Product.create(newProduct({ name }))).toThrow(InvariantViolationError);
  });

  it('rejects a zero price', () => {
    expect(() => Product.create(newProduct({ price: Money.zero('USD') }))).toThrow(
      InvariantViolationError,
    );
  });

  it('rejects an invalid SKU', () => {
    expect(() => Product.create(newProduct({ sku: 'bad sku' }))).toThrow(InvalidSkuError);
  });
});

describe('Sku', () => {
  it.each([['ABC'], ['SNEAKER-RED-42'], ['A'.repeat(64)]])('accepts %s', (value) => {
    expect(Sku.of(value).value).toBe(value);
  });

  it.each([['AB'], ['lower'], ['-DASH-FIRST'], ['A'.repeat(65)], ['WITH SPACE']])(
    'rejects %s',
    (value) => {
      expect(() => Sku.of(value)).toThrow(InvalidSkuError);
    },
  );

  it('compares by value', () => {
    expect(Sku.of('ABC-1').equals(Sku.of('ABC-1'))).toBe(true);
  });
});
