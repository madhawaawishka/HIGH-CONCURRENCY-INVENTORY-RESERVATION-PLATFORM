import { ConcurrentModificationError, retry, type Clock } from '@stockforge/shared-kernel';

import { UnknownProductError } from '../domain/inventory.errors.js';
import { StockLevel } from '../domain/stock-level.js';
import { StockLevelConflictError, type InventoryUnitOfWork, type ProductCatalog } from './ports.js';

export interface AdjustStockCommand {
  readonly productId: string;
  /** Positive to restock, negative to write off. */
  readonly delta: number;
  readonly reason: string;
  readonly actorId: string;
}

/** Bounded retries: a lost optimistic lock is retried a few times, never forever. */
const MAX_ATTEMPTS = 3;

export class AdjustStockHandler {
  constructor(
    private readonly unitOfWork: InventoryUnitOfWork,
    private readonly catalog: ProductCatalog,
    private readonly clock: Clock,
  ) {}

  /**
   * Optimistic concurrency: read the stock level, apply the domain rule, then write only if the
   * version is unchanged. On a conflict, retry against fresh state with jittered backoff.
   */
  async execute(command: AdjustStockCommand): Promise<StockLevel> {
    if (!(await this.catalog.productExists(command.productId))) {
      throw new UnknownProductError(command.productId);
    }

    try {
      return await retry(() => this.adjustOnce(command), {
        attempts: MAX_ATTEMPTS,
        shouldRetry: (error) => error instanceof StockLevelConflictError,
        baseDelayMs: 10,
        maxDelayMs: 100,
      });
    } catch (error) {
      if (error instanceof StockLevelConflictError) {
        throw new ConcurrentModificationError('Stock level', command.productId);
      }
      throw error;
    }
  }

  private adjustOnce(command: AdjustStockCommand): Promise<StockLevel> {
    return this.unitOfWork.run(async (tx) => {
      const current =
        (await tx.stock.find(command.productId)) ?? StockLevel.empty(command.productId);
      const next = current.adjust(command.delta, this.clock.now());

      if (current.isRecorded) {
        await tx.stock.update(next, current.version);
      } else {
        await tx.stock.insert(next);
      }
      await tx.auditLog.record({
        actorId: command.actorId,
        action: 'STOCK_ADJUSTED',
        aggregateType: 'inventory',
        aggregateId: command.productId,
        metadata: {
          delta: command.delta,
          reason: command.reason,
          availableBefore: current.available,
          availableAfter: next.available,
          version: next.version,
        },
      });
      return next;
    });
  }
}
