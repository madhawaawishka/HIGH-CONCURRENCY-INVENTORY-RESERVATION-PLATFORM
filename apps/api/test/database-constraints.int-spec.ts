import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, type TestApp } from './support/test-app.js';

/**
 * The CHECK constraints are the last line of defense: even code that bypasses the domain model
 * (a bug, a manual SQL fix) cannot put inventory into an invalid state.
 */
let t: TestApp;
const productId = '0199d1e2-7b3a-7000-8000-000000000001';

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.resetDatabase();
  await t.prisma.product.create({
    data: {
      id: productId,
      sku: 'CHECK-TEST',
      name: 'Check test',
      priceCents: 100,
      currency: 'USD',
    },
  });
  await t.prisma.inventory.create({
    data: { productId, totalQuantity: 10, availableQuantity: 10 },
  });
});

describe('inventory CHECK constraints', () => {
  it('rejects buckets that do not add up to the total', async () => {
    await expect(
      t.prisma
        .$executeRaw`UPDATE inventory SET available_quantity = 11 WHERE product_id = ${productId}::uuid`,
    ).rejects.toThrow(/inventory_balanced/);
  });

  it('rejects negative quantities', async () => {
    await expect(
      t.prisma
        .$executeRaw`UPDATE inventory SET available_quantity = -1, total_quantity = -1 WHERE product_id = ${productId}::uuid`,
    ).rejects.toThrow(/inventory_non_negative/);
  });
});

describe('product CHECK constraints', () => {
  it('rejects a non-positive price', async () => {
    await expect(
      t.prisma.$executeRaw`UPDATE products SET price_cents = 0 WHERE id = ${productId}::uuid`,
    ).rejects.toThrow(/products_price_positive/);
  });
});
