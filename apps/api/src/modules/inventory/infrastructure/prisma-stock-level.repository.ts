import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
  type TransactionClient,
} from '@stockforge/database';

import { StockLevelConflictError, type StockLevelRepository } from '../application/ports.js';
import { UnknownProductError } from '../domain/inventory.errors.js';
import { StockLevel } from '../domain/stock-level.js';

export class PrismaStockLevelRepository implements StockLevelRepository {
  constructor(private readonly db: TransactionClient) {}

  async find(productId: string): Promise<StockLevel | null> {
    const row = await this.db.inventory.findUnique({ where: { productId } });
    if (row === null) {
      return null;
    }
    return StockLevel.restore({
      productId: row.productId,
      total: row.totalQuantity,
      available: row.availableQuantity,
      reserved: row.reservedQuantity,
      sold: row.soldQuantity,
      version: row.version,
      updatedAt: row.updatedAt,
    });
  }

  async insert(stock: StockLevel): Promise<void> {
    try {
      await this.db.inventory.create({ data: { productId: stock.productId, ...toColumns(stock) } });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new StockLevelConflictError(stock.productId);
      }
      if (isForeignKeyViolation(error)) {
        throw new UnknownProductError(stock.productId);
      }
      throw error;
    }
  }

  /**
   * Compare-and-set on the version column: the row changes only if nobody else changed it
   * since we read it. Zero rows updated means we lost the race.
   */
  async update(stock: StockLevel, expectedVersion: number): Promise<void> {
    const { count } = await this.db.inventory.updateMany({
      where: { productId: stock.productId, version: expectedVersion },
      data: toColumns(stock),
    });
    if (count === 0) {
      throw new StockLevelConflictError(stock.productId);
    }
  }
}

function toColumns(stock: StockLevel) {
  return {
    totalQuantity: stock.total,
    availableQuantity: stock.available,
    reservedQuantity: stock.reserved,
    soldQuantity: stock.sold,
    version: stock.version,
    ...(stock.updatedAt === null ? {} : { updatedAt: stock.updatedAt }),
  };
}
