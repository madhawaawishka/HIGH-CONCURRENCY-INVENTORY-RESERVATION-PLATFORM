import { ProblemDetails } from '@stockforge/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ADMIN_KEY, createTestApp, type TestApp } from './support/test-app.js';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

describe('request ids', () => {
  it('echoes a well-formed X-Request-Id for cross-service correlation', async () => {
    const response = await request(t.http).get('/v1/products').set('X-Request-Id', 'abc-123');

    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('replaces a malformed X-Request-Id to prevent log injection', async () => {
    const response = await request(t.http)
      .get('/v1/products')
      .set('X-Request-Id', 'bad id with spaces');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('error format', () => {
  it('returns Problem Details with the request id for malformed JSON', async () => {
    const response = await request(t.http)
      .post('/v1/admin/products')
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .set('Content-Type', 'application/json')
      .send('{"sku":')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    const problem = ProblemDetails.parse(response.body);
    expect(problem.requestId).toBe(response.headers['x-request-id']);
  });

  it('rejects oversized bodies with 413 before parsing them', async () => {
    const response = await request(t.http)
      .post('/v1/admin/products')
      .set('X-Admin-Api-Key', ADMIN_KEY)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(200_000) }))
      .expect(413);

    expect(ProblemDetails.parse(response.body).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns Problem Details for unknown routes', async () => {
    const response = await request(t.http).get('/v1/does-not-exist').expect(404);

    expect(ProblemDetails.parse(response.body).code).toBe('NOT_FOUND');
  });
});

describe('OpenAPI document', () => {
  const OpenApi = z.object({
    openapi: z.string(),
    paths: z.record(z.string(), z.unknown()),
    components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
  });

  it('is generated from the Zod contracts', async () => {
    const response = await request(t.http).get('/docs/openapi.json').expect(200);
    const document = OpenApi.parse(response.body);

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/v1/products',
        '/v1/products/{id}',
        '/v1/products/{productId}/availability',
        '/v1/admin/products',
        '/v1/admin/inventory/{productId}',
        '/v1/admin/inventory/{productId}/adjustments',
      ]),
    );
    expect(Object.keys(document.components.schemas)).toEqual(
      expect.arrayContaining(['Product', 'ProblemDetails', 'CreateProductRequest', 'StockLevel']),
    );
  });
});
