import { describe, expect, it } from 'vitest';

import {
  InvalidOrderTransitionError,
  isTerminalStatus,
  nextOrderStatus,
  ORDER_STATUSES,
  type OrderEvent,
  type OrderStatus,
} from './order-status.js';

const confirm: OrderEvent = { type: 'PAYMENT_CONFIRMED' };
const cancel: OrderEvent = { type: 'CANCEL', reason: 'PAYMENT_FAILED' };

/** Together these two tables cover every status × every event. */
const LEGAL: readonly [OrderStatus, OrderEvent, OrderStatus][] = [
  ['PENDING_PAYMENT', confirm, 'CONFIRMED'],
  ['PENDING_PAYMENT', cancel, 'CANCELLED'],
];
const ILLEGAL: readonly [OrderStatus, OrderEvent][] = [
  ['CONFIRMED', confirm],
  ['CONFIRMED', cancel],
  ['CANCELLED', confirm],
  ['CANCELLED', cancel],
];

describe('order state machine', () => {
  it('covers every status and event combination', () => {
    expect(LEGAL.length + ILLEGAL.length).toBe(ORDER_STATUSES.length * 2);
  });

  it.each(LEGAL)('%s + %o -> %s', (from, event, expected) => {
    expect(nextOrderStatus(from, event)).toBe(expected);
  });

  it.each(ILLEGAL)('rejects %s + %o', (from, event) => {
    expect(() => nextOrderStatus(from, event)).toThrow(InvalidOrderTransitionError);
  });

  it.each<[OrderStatus, boolean]>([
    ['PENDING_PAYMENT', false],
    ['CONFIRMED', true],
    ['CANCELLED', true],
  ])('%s terminal: %s', (status, terminal) => {
    expect(isTerminalStatus(status)).toBe(terminal);
  });
});
