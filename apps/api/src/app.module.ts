import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';

import { CatalogModule } from './modules/catalog/public-api.js';
import { InventoryModule } from './modules/inventory/public-api.js';
import { ConfigModule } from './platform/config/config.module.js';
import { CoreModule } from './platform/core/core.module.js';
import { DatabaseModule } from './platform/database/database.module.js';
import { ProblemDetailsFilter } from './platform/http/problem-details.filter.js';
import { RequestValidationError } from './platform/http/request-validation.error.js';

@Module({
  imports: [ConfigModule, CoreModule, DatabaseModule, CatalogModule, InventoryModule],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    {
      // Validates every @Body/@Query/@Param that declares a Zod (Standard Schema) schema.
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({
        exceptionFactory: (issues) => RequestValidationError.fromSchemaIssues(issues),
      }),
    },
  ],
})
export class AppModule {}
