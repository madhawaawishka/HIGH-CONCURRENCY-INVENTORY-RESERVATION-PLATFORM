import { DomainError } from '@stockforge/shared-kernel';

export const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type CancellationReason =
  | 'PAYMENT_FAILED'
  | 'RESERVATION_EXPIRED'
  | 'CUSTOMER_REQUEST'
  /** Payment succeeded, but the reservation had already expired: the order is refunded. */
  | 'PAID_AFTER_RESERVATION_EXPIRED';

export type OrderEvent =
  | { readonly type: 'PAYMENT_CONFIRMED' }
  | { readonly type: 'CANCEL'; readonly reason: CancellationReason };

export type OrderEventType = OrderEvent['type'];

export class InvalidOrderTransitionError extends DomainError {
  readonly code = 'INVALID_ORDER_TRANSITION';
  readonly kind = 'conflict';

  constructor(from: OrderStatus, event: OrderEventType) {
    super(`An order in status ${from} cannot handle ${event}.`, { from, event });
  }
}

/**
 * The only legal transitions (spec Section 11). Anything not listed is rejected, so an
 * unexpected combination fails loudly instead of corrupting state.
 */
const TRANSITIONS: Readonly<Record<OrderStatus, Partial<Record<OrderEventType, OrderStatus>>>> = {
  PENDING_PAYMENT: { PAYMENT_CONFIRMED: 'CONFIRMED', CANCEL: 'CANCELLED' },
  CONFIRMED: {},
  CANCELLED: {},
};

export function nextOrderStatus(current: OrderStatus, event: OrderEvent): OrderStatus {
  const next = TRANSITIONS[current][event.type];
  if (next === undefined) {
    throw new InvalidOrderTransitionError(current, event.type);
  }
  return next;
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}
