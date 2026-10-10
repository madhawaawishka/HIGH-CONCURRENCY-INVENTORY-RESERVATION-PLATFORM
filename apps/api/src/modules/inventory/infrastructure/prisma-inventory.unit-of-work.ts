import type { PrismaClient } from '@stockforge/database';
import type { IdGenerator } from '@stockforge/shared-kernel';

import { PrismaAuditLog } from '../../../platform/audit/prisma-audit-log.js';
import type { InventoryTransaction, InventoryUnitOfWork } from '../application/ports.js';
import { PrismaStockLevelRepository } from './prisma-stock-level.repository.js';

export class PrismaInventoryUnitOfWork implements InventoryUnitOfWork {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ids: IdGenerator,
  ) {}

  run<T>(work: (tx: InventoryTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work({
        stock: new PrismaStockLevelRepository(tx),
        auditLog: new PrismaAuditLog(tx, this.ids),
      }),
    );
  }
}
