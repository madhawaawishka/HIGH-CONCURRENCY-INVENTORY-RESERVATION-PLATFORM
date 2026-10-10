import type { PrismaClient } from '@stockforge/database';
import type { IdGenerator } from '@stockforge/shared-kernel';

import { PrismaAuditLog } from '../../../platform/audit/prisma-audit-log.js';
import type { CatalogTransaction, CatalogUnitOfWork } from '../application/ports.js';
import { PrismaProductRepository } from './prisma-product.repository.js';

export class PrismaCatalogUnitOfWork implements CatalogUnitOfWork {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ids: IdGenerator,
  ) {}

  run<T>(work: (tx: CatalogTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work({
        products: new PrismaProductRepository(tx),
        auditLog: new PrismaAuditLog(tx, this.ids),
      }),
    );
  }
}
