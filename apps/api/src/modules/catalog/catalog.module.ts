import { Module } from '@nestjs/common';
import { PrismaClient } from '@stockforge/database';
import type { Clock, IdGenerator } from '@stockforge/shared-kernel';

import { CLOCK, ID_GENERATOR } from '../../platform/core/core.module.js';
import { CATALOG_FACADE, CatalogFacadeService } from './application/catalog-facade.js';
import { CreateProductHandler } from './application/create-product.handler.js';
import { GetProductHandler } from './application/get-product.handler.js';
import { ListProductsHandler } from './application/list-products.handler.js';
import type { CatalogUnitOfWork, ProductRepository } from './application/ports.js';
import { PrismaCatalogUnitOfWork } from './infrastructure/prisma-catalog.unit-of-work.js';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository.js';
import { AdminProductsController } from './interface/admin-products.controller.js';
import { ProductsController } from './interface/products.controller.js';

const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
const CATALOG_UNIT_OF_WORK = Symbol('CATALOG_UNIT_OF_WORK');

/**
 * Composition root of the Catalog module. Application classes are plain TypeScript; this is
 * the only place that knows how they are wired to Prisma and the framework.
 */
@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new PrismaProductRepository(prisma),
    },
    {
      provide: CATALOG_UNIT_OF_WORK,
      inject: [PrismaClient, ID_GENERATOR],
      useFactory: (prisma: PrismaClient, ids: IdGenerator) =>
        new PrismaCatalogUnitOfWork(prisma, ids),
    },
    {
      provide: CreateProductHandler,
      inject: [CATALOG_UNIT_OF_WORK, ID_GENERATOR, CLOCK],
      useFactory: (unitOfWork: CatalogUnitOfWork, ids: IdGenerator, clock: Clock) =>
        new CreateProductHandler(unitOfWork, ids, clock),
    },
    {
      provide: GetProductHandler,
      inject: [PRODUCT_REPOSITORY],
      useFactory: (products: ProductRepository) => new GetProductHandler(products),
    },
    {
      provide: ListProductsHandler,
      inject: [PRODUCT_REPOSITORY],
      useFactory: (products: ProductRepository) => new ListProductsHandler(products),
    },
    {
      provide: CATALOG_FACADE,
      inject: [PRODUCT_REPOSITORY],
      useFactory: (products: ProductRepository) => new CatalogFacadeService(products),
    },
  ],
  exports: [CATALOG_FACADE],
})
export class CatalogModule {}
