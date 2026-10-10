import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { APP_CONFIG, type AppConfig } from './platform/config/app-config.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
const config = app.get<AppConfig>(APP_CONFIG);
configureApp(app, config);

await app.listen(config.http.port);
new Logger('Bootstrap').log(
  `StockForge API listening on http://localhost:${config.http.port} (OpenAPI docs at /docs)`,
);
