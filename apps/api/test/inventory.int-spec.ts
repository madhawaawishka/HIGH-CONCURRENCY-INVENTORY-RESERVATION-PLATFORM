import {
  AvailabilityResponse,
  ProblemDetails,
  ProductResponse,
  StockLevelResponse,
} from '@stockforge/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ADMIN_KEY, createTestApp, type TestApp } from './support/test-app.js';

let t: TestApp;
let productId: string;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.resetDatabase();
  const response = await request(t.http)
    .post('/v1/admin/products')
    .set('X-Admin-Api-Key', ADMIN_KEY)
    .send({
      sku: 'CAP-WHT-OS',
      name: 'Flash Sale Cap',
      price: { amountMinor: 1_999, currency: 'USD' },
    })
    .expect(201);
  productId = ProductResponse.parse(response.body).id;
});

const adjust = (delta: number, reason = 'Integration test') =>
  request(t.http)
    .post(`/v1/admin/inventory/${productId}/adjustments`)
    .set('X-Admin-Api-Key', ADMIN_KEY)
    .send({ delta, reason });

describe('availability', () => {
  it('reports zero stock for a product whose stock was never recorded', async () => {
    const response = await request(t.http)
      .get(`/v1/products/${productId}/availability`)
      .expect(200);

    expect(AvailabilityResponse.parse(response.body)).toEqual({
      productId,
      available: 0,
      inStock: false,
    });
  });

  it('returns 404 for a product that does not exist', async () => {
    await request(t.http)
      .get('/v1/products/0199d1e2-7b3a-7000-8000-0000000000ff/availability')
      .expect(404);
  });
});

describe('stock adjustments', () => {
  it('restocks and writes off, keeping every bucket consistent', async () => {
    await adjust(10).expect(200);
    const response = await adjust(-3, 'Damaged in transit').expect(200);

    expect(StockLevelResponse.parse(response.body)).toMatchObject({
      total: 7,
      available: 7,
      reserved: 0,
      sold: 0,
    });
    const audit = await t.prisma.auditLog.findMany({ where: { aggregateId: productId } });
    expect(audit.filter((entry) => entry.action === 'STOCK_ADJUSTED')).toHaveLength(2);
  });

  it('refuses to write off more than is available, leaving stock unchanged', async () => {
    await adjust(5).expect(200);

    const response = await adjust(-6).expect(409);

    expect(ProblemDetails.parse(response.body).code).toBe('INSUFFICIENT_STOCK');
    const stock = await request(t.http)
      .get(`/v1/admin/inventory/${productId}`)
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .expect(200);
    expect(StockLevelResponse.parse(stock.body).available).toBe(5);
  });

  it('rejects adjustments for unknown products with 404', async () => {
    await request(t.http)
      .post('/v1/admin/inventory/0199d1e2-7b3a-7000-8000-0000000000ff/adjustments')
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .send({ delta: 1, reason: 'Unknown product' })
      .expect(404);
  });

  it('never loses an update when adjustments race (optimistic concurrency)', async () => {
    await adjust(100).expect(200);

    const responses = await Promise.all(Array.from({ length: 20 }, () => adjust(-1)));

    // Each request either applied exactly once or failed explicitly with 409; none was lost.
    const succeeded = responses.filter((response) => response.status === 200).length;
    const failed = responses.filter((response) => response.status === 409);
    expect(succeeded + failed.length).toBe(20);
    for (const response of failed) {
      expect(ProblemDetails.parse(response.body).code).toBe('CONCURRENT_MODIFICATION');
    }

    const row = await t.prisma.inventory.findUniqueOrThrow({ where: { productId } });
    expect(row.availableQuantity).toBe(100 - succeeded);
    expect(row.totalQuantity).toBe(100 - succeeded);
    expect(row.version).toBe(1 + succeeded);
  });
});
