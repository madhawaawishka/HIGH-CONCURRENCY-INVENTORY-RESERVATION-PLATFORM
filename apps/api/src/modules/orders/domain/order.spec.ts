import { CurrencyMismatchError, InvariantViolationError, Money } from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { Order, type OrderLine, type PlaceOrder } from './order.js';
import { InvalidOrderTransitionError } from './order-status.js';

const placedAt = new Date('2026-10-10T12:00:00.000Z');
const later = new Date('2026-10-10T12:05:00.000Z');

const line = (overrides: Partial<OrderLine> = {}): OrderLine => ({
  productId: '0199d1e2-7b3a-7000-8000-000000000001',
  quantity: 2,
  unitPrice: Money.of(1_999, 'USD'),
  ...overrides,
});

const place = (overrides: Partial<PlaceOrder> = {}): Order =>
  Order.place({
    id: '0199d1e2-7b3a-7000-8000-0000000000a1',
    userId: 'user-1',
    reservationId: '0199d1e2-7b3a-7000-8000-0000000000b1',
    lines: [line()],
    now: placedAt,
    ...overrides,
  });

describe('Order.place', () => {
  it('starts pending payment, with the placement recorded in its history', () => {
    const order = place();

    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.statusHistory).toEqual([
      { from: null, to: 'PENDING_PAYMENT', reason: 'PLACED', at: placedAt },
    ]);
  });

  it('computes the total from the price snapshots', () => {
    const order = place({
      lines: [line(), line({ quantity: 1, unitPrice: Money.of(500, 'USD') })],
    });

    expect(order.total.equals(Money.of(1_999 * 2 + 500, 'USD'))).toBe(true);
  });

  it('rejects an order without lines', () => {
    expect(() => place({ lines: [] })).toThrow(InvariantViolationError);
  });

  it.each([[0], [-1], [1.5]])('rejects the quantity %s', (quantity) => {
    expect(() => place({ lines: [line({ quantity })] })).toThrow(InvariantViolationError);
  });

  it('rejects lines in different currencies', () => {
    const lines = [line(), line({ unitPrice: Money.of(100, 'EUR') })];

    expect(() => place({ lines })).toThrow(CurrencyMismatchError);
  });
});

describe('Order lifecycle', () => {
  it('confirms after payment and records the change', () => {
    const order = place();

    order.confirm(later);

    expect(order.status).toBe('CONFIRMED');
    expect(order.statusHistory.at(-1)).toEqual({
      from: 'PENDING_PAYMENT',
      to: 'CONFIRMED',
      reason: 'PAYMENT_CONFIRMED',
      at: later,
    });
  });

  it('cancels with a reason', () => {
    const order = place();

    order.cancel('RESERVATION_EXPIRED', later);

    expect(order.status).toBe('CANCELLED');
    expect(order.cancellationReason).toBe('RESERVATION_EXPIRED');
    expect(order.refundRequired).toBe(false);
  });

  it('requires a refund when payment arrived after the reservation expired', () => {
    const order = place();

    order.cancel('PAID_AFTER_RESERVATION_EXPIRED', later);

    expect(order.refundRequired).toBe(true);
  });

  it('rejects changes to a finished order and leaves it unchanged', () => {
    const order = place();
    order.confirm(later);

    expect(() => {
      order.cancel('CUSTOMER_REQUEST', later);
    }).toThrow(InvalidOrderTransitionError);
    expect(order.status).toBe('CONFIRMED');
    expect(order.cancellationReason).toBeNull();
    expect(order.statusHistory).toHaveLength(2);
  });
});
