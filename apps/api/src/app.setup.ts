import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

import type { AppConfig } from './platform/config/app-config.js';
import { setupOpenApi } from './platform/http/openapi.js';
import { requestContextMiddleware } from './platform/http/request-context.js';

/** Request bodies above this size are rejected with 413 before any parsing work is done. */
const MAX_JSON_BODY = '100kb';

/**
 * HTTP-level configuration shared by the real server and the integration tests, so tests
 * exercise exactly what runs in production. The app must be created with `bodyParser: false`.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.disable('x-powered-by');
  // Order matters: the request id must exist before body parsing can fail.
  app.use(requestContextMiddleware);
  app.useBodyParser('json', { limit: MAX_JSON_BODY });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  if (config.environment !== 'production') {
    setupOpenApi(app);
  }
}
