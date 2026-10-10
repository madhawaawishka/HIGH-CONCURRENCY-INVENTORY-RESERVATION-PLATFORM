import { Module } from '@nestjs/common';
import { PrismaClient } from '@stockforge/database';
import type { Clock, IdGenerator } from '@stockforge/shared-kernel';

import { CLOCK, ID_GENERATOR } from '../../platform/core/core.module.js';
import { CATALOG_FACADE, CatalogModule } from '../catalog/public-api.js';
import { AdjustStockHandler } from './application/adjust-stock.handler.js';
import { GetStockLevelHandler } from './application/get-stock-level.handler.js';
import type {
  InventoryUnitOfWork,
  ProductCatalog,
  StockLevelRepository,
} from './application/ports.js';
import { PrismaInventoryUnitOfWork } from './infrastructure/prisma-inventory.unit-of-work.js';
import { PrismaStockLevelRepository } from './infrastructure/prisma-stock-level.repository.js';
import { AdminInventoryController } from './interface/admin-inventory.controller.js';
import { AvailabilityController } from './interface/availability.controller.js';

const STOCK_LEVEL_REPOSITORY = Symbol('STOCK_LEVEL_REPOSITORY');
const INVENTORY_UNIT_OF_WORK = Symbol('INVENTORY_UNIT_OF_WORK');
const PRODUCT_CATALOG = Symbol('PRODUCT_CATALOG');

/** Composition root of the Inventory module. */
@Module({
  imports: [CatalogModule],
  controllers: [AvailabilityController, AdminInventoryController],
  providers: [
    // Inventory's own ProductCatalog port, satisfied by the Catalog module's public facade.
    { provide: PRODUCT_CATALOG, useExisting: CATALOG_FACADE },
    {
      provide: STOCK_LEVEL_REPOSITORY,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new PrismaStockLevelRepository(prisma),
    },
    {
      provide: INVENTORY_UNIT_OF_WORK,
      inject: [PrismaClient, ID_GENERATOR],
      useFactory: (prisma: PrismaClient, ids: IdGenerator) =>
        new PrismaInventoryUnitOfWork(prisma, ids),
    },
    {
      provide: GetStockLevelHandler,
      inject: [STOCK_LEVEL_REPOSITORY, PRODUCT_CATALOG],
      useFactory: (stock: StockLevelRepository, catalog: ProductCatalog) =>
        new GetStockLevelHandler(stock, catalog),
    },
    {
      provide: AdjustStockHandler,
      inject: [INVENTORY_UNIT_OF_WORK, PRODUCT_CATALOG, CLOCK],
      useFactory: (unitOfWork: InventoryUnitOfWork, catalog: ProductCatalog, clock: Clock) =>
        new AdjustStockHandler(unitOfWork, catalog, clock),
    },
  ],
})
export class InventoryModule {}
