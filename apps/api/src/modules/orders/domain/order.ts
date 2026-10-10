import { InvariantViolationError, Money } from '@stockforge/shared-kernel';

import {
  nextOrderStatus,
  type CancellationReason,
  type OrderEvent,
  type OrderStatus,
} from './order-status.js';

export interface OrderLine {
  readonly productId: string;
  readonly quantity: number;
  /** Price snapshot taken when the order is placed; later catalog price changes never apply. */
  readonly unitPrice: Money;
}

export interface StatusChange {
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly reason: string;
  readonly at: Date;
}

export interface PlaceOrder {
  readonly id: string;
  readonly userId: string;
  readonly reservationId: string;
  readonly lines: readonly OrderLine[];
  readonly now: Date;
}

/**
 * Order aggregate. Status changes go only through the state machine in order-status.ts, and
 * every change is recorded, so the full history can be persisted and shown to the customer.
 * Persistence and the checkout saga are added in Weeks 2 and 4.
 */
export class Order {
  private currentStatus: OrderStatus = 'PENDING_PAYMENT';
  private cancellation: CancellationReason | null = null;
  private readonly history: StatusChange[];

  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly reservationId: string,
    readonly lines: readonly OrderLine[],
    readonly total: Money,
    placedAt: Date,
  ) {
    this.history = [{ from: null, to: 'PENDING_PAYMENT', reason: 'PLACED', at: placedAt }];
  }

  static place(input: PlaceOrder): Order {
    const [first] = input.lines;
    if (first === undefined) {
      throw new InvariantViolationError('An order needs at least one line.');
    }
    for (const line of input.lines) {
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
        throw new InvariantViolationError('Order quantities must be positive whole numbers.', {
          productId: line.productId,
          quantity: line.quantity,
        });
      }
    }
    // Money.add rejects mixed currencies, so an order is always in a single currency.
    const total = input.lines.reduce(
      (sum, line) => sum.add(line.unitPrice.multiply(line.quantity)),
      Money.zero(first.unitPrice.currency),
    );
    return new Order(
      input.id,
      input.userId,
      input.reservationId,
      [...input.lines],
      total,
      input.now,
    );
  }

  get status(): OrderStatus {
    return this.currentStatus;
  }

  get cancellationReason(): CancellationReason | null {
    return this.cancellation;
  }

  /** True when the customer paid but the order could not be fulfilled (saga compensation). */
  get refundRequired(): boolean {
    return this.cancellation === 'PAID_AFTER_RESERVATION_EXPIRED';
  }

  get statusHistory(): readonly StatusChange[] {
    return this.history;
  }

  /** Payment succeeded and the reservation was confirmed before it expired. */
  confirm(at: Date): void {
    this.apply({ type: 'PAYMENT_CONFIRMED' }, 'PAYMENT_CONFIRMED', at);
  }

  cancel(reason: CancellationReason, at: Date): void {
    this.apply({ type: 'CANCEL', reason }, reason, at);
    this.cancellation = reason;
  }

  private apply(event: OrderEvent, reason: string, at: Date): void {
    const next = nextOrderStatus(this.currentStatus, event);
    this.history.push({ from: this.currentStatus, to: next, reason, at });
    this.currentStatus = next;
  }
}
