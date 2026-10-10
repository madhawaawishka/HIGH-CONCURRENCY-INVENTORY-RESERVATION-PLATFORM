import { InvariantViolationError } from '@stockforge/shared-kernel';

import { InsufficientStockError } from './inventory.errors.js';

/** Largest quantity a 32-bit integer column can store. */
const MAX_UNITS = 2_147_483_647;

export interface StockLevelState {
  readonly productId: string;
  /** Always available + reserved + sold. */
  readonly total: number;
  readonly available: number;
  readonly reserved: number;
  readonly sold: number;
  /** Optimistic-concurrency version; increases with every change. */
  readonly version: number;
  /** Null until stock has been recorded for the product for the first time. */
  readonly updatedAt: Date | null;
}

/**
 * Stock of one product. Every unit is in exactly one bucket (available, reserved or sold), and
 * no bucket can go negative. The same invariants are CHECK constraints in the database, which
 * act as the last line of defense if this code ever has a bug.
 *
 * Immutable: every change returns a new StockLevel with the version incremented.
 */
export class StockLevel {
  private constructor(private readonly state: StockLevelState) {}

  /** A product whose stock has never been recorded. */
  static empty(productId: string): StockLevel {
    return new StockLevel({
      productId,
      total: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      version: 0,
      updatedAt: null,
    });
  }

  static restore(state: StockLevelState): StockLevel {
    assertInvariants(state);
    return new StockLevel(state);
  }

  /** Restocks (positive delta) or writes off (negative delta) available units. */
  adjust(delta: number, at: Date): StockLevel {
    if (!Number.isSafeInteger(delta) || delta === 0) {
      throw new InvariantViolationError('A stock adjustment must be a non-zero whole number.', {
        delta,
      });
    }
    if (this.available + delta < 0) {
      throw new InsufficientStockError(this.productId, -delta, this.available);
    }
    return StockLevel.restore({
      ...this.state,
      total: this.total + delta,
      available: this.available + delta,
      version: this.version + 1,
      updatedAt: at,
    });
  }

  /** False until stock is recorded for the first time (no row exists yet). */
  get isRecorded(): boolean {
    return this.state.updatedAt !== null;
  }

  get inStock(): boolean {
    return this.available > 0;
  }

  get productId(): string {
    return this.state.productId;
  }

  get total(): number {
    return this.state.total;
  }

  get available(): number {
    return this.state.available;
  }

  get reserved(): number {
    return this.state.reserved;
  }

  get sold(): number {
    return this.state.sold;
  }

  get version(): number {
    return this.state.version;
  }

  get updatedAt(): Date | null {
    return this.state.updatedAt;
  }
}

function assertInvariants(state: StockLevelState): void {
  const { total, available, reserved, sold, version } = state;
  for (const [name, value] of Object.entries({ total, available, reserved, sold, version })) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UNITS) {
      throw new InvariantViolationError(
        `Stock ${name} must be a whole number between 0 and ${MAX_UNITS}.`,
        { [name]: value },
      );
    }
  }
  if (available + reserved + sold !== total) {
    throw new InvariantViolationError('Stock buckets must add up to the total.', {
      total,
      available,
      reserved,
      sold,
    });
  }
}
