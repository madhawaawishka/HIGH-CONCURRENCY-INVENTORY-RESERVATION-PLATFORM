import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

import { ADMIN_API_KEY_HEADER, ADMIN_SECURITY_SCHEME } from './admin-api-key.guard.js';
import { REQUEST_ID_HEADER } from './request-context.js';

/**
 * Builds the OpenAPI document from the controllers. Request and response schemas come straight
 * from the Zod contracts (Standard Schema), so validation and documentation cannot drift apart.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('StockForge API')
    .setDescription(
      'High-concurrency inventory and reservation platform. Errors use RFC 9457 Problem Details ' +
        `(application/problem+json). Every response carries an ${REQUEST_ID_HEADER} header.`,
    )
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: ADMIN_API_KEY_HEADER }, ADMIN_SECURITY_SCHEME)
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Serves Swagger UI at /docs and the raw document at /docs/openapi.json. */
export function setupOpenApi(app: INestApplication): void {
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: 'docs/openapi.json',
  });
}
