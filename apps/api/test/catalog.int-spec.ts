import { ProblemDetails, ProductPageResponse, ProductResponse } from '@stockforge/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ADMIN_KEY, createTestApp, type TestApp } from './support/test-app.js';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.resetDatabase();
});

const newProduct = (sku: string) => ({
  sku,
  name: `Product ${sku}`,
  price: { amountMinor: 1_999, currency: 'USD' },
});

async function createProduct(sku: string): Promise<ProductResponse> {
  const response = await request(t.http)
    .post('/v1/admin/products')
    .set('X-Admin-Api-Key', ADMIN_KEY)
    .send(newProduct(sku))
    .expect(201);
  return ProductResponse.parse(response.body);
}

describe('POST /v1/admin/products', () => {
  it('creates a product, returns its location and writes an audit entry', async () => {
    const response = await request(t.http)
      .post('/v1/admin/products')
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .send(newProduct('SNEAKER-RED-42'))
      .expect(201);

    const product = ProductResponse.parse(response.body);
    expect(product).toMatchObject({ sku: 'SNEAKER-RED-42', status: 'ACTIVE' });
    expect(response.headers.location).toBe(`/v1/products/${product.id}`);

    const audit = await t.prisma.auditLog.findMany({ where: { aggregateId: product.id } });
    expect(audit).toEqual([
      expect.objectContaining({ action: 'PRODUCT_CREATED', actorId: 'admin-api-key' }),
    ]);
  });

  it('rejects a duplicate SKU with 409, even when the requests race', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(t.http)
          .post('/v1/admin/products')
          .set('X-Admin-Api-Key', ADMIN_KEY)
          .send(newProduct('RACE-SKU')),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await t.prisma.product.count()).toBe(1);
  });

  it('returns field-level validation errors as Problem Details', async () => {
    const response = await request(t.http)
      .post('/v1/admin/products')
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .send({ sku: 'bad sku', name: '', price: { amountMinor: 0, currency: 'usd' } })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    const problem = ProblemDetails.parse(response.body);
    expect(problem.code).toBe('VALIDATION_FAILED');
    expect(problem.errors?.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['sku', 'name', 'price.amountMinor', 'price.currency']),
    );
  });

  it.each([
    ['a missing key', undefined],
    ['a wrong key', 'wrong-key'],
  ])('rejects %s with 401', async (_case, key) => {
    const call = request(t.http).post('/v1/admin/products').send(newProduct('NO-AUTH-1'));
    if (key !== undefined) {
      void call.set('X-Admin-Api-Key', key);
    }

    const response = await call.expect(401);

    expect(ProblemDetails.parse(response.body).code).toBe('UNAUTHORIZED');
  });
});

describe('GET /v1/products/:id', () => {
  it('returns a product', async () => {
    const created = await createProduct('HOODIE-BLK-M');

    const response = await request(t.http).get(`/v1/products/${created.id}`).expect(200);

    expect(ProductResponse.parse(response.body)).toEqual(created);
  });

  it('returns 404 Problem Details for an unknown product', async () => {
    const response = await request(t.http)
      .get('/v1/products/0199d1e2-7b3a-7000-8000-0000000000ff')
      .expect(404);

    expect(ProblemDetails.parse(response.body).code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('GET /v1/products (keyset pagination)', () => {
  it('walks every product exactly once, newest first', async () => {
    const created: ProductResponse[] = [];
    for (let index = 1; index <= 5; index += 1) {
      created.push(await createProduct(`PAGE-SKU-${index}`));
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const response = await request(t.http)
        .get('/v1/products')
        .query({ limit: 2, ...(cursor === null ? {} : { cursor }) })
        .expect(200);
      const page = ProductPageResponse.parse(response.body);
      seen.push(...page.data.map((product) => product.id));
      cursor = page.page.nextCursor;
      pages += 1;
    } while (cursor !== null);

    expect(pages).toBe(3);
    expect(seen).toEqual(created.map((product) => product.id).reverse());
  });

  it('rejects a tampered cursor with 400', async () => {
    const response = await request(t.http)
      .get('/v1/products')
      .query({ cursor: 'tampered' })
      .expect(400);

    expect(ProblemDetails.parse(response.body).errors).toEqual([
      { path: 'cursor', message: 'Invalid pagination cursor.' },
    ]);
  });
});
