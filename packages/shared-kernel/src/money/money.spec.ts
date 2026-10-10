import { describe, expect, it } from 'vitest';

import { InvariantViolationError } from '../errors/domain-error.js';
import { CurrencyMismatchError, Money } from './money.js';

describe('Money', () => {
  it('stores amounts as integer minor units with a currency', () => {
    const price = Money.of(1999, 'USD');

    expect(price.amountMinor).toBe(1999);
    expect(price.currency).toBe('USD');
  });

  it.each([
    ['a fractional amount', 19.99, 'USD'],
    ['a negative amount', -1, 'USD'],
    ['an unsafe integer', Number.MAX_SAFE_INTEGER + 1, 'USD'],
    ['a lowercase currency', 100, 'usd'],
    ['a non-ISO currency', 100, 'DOLLAR'],
  ])('rejects %s', (_case, amount, currency) => {
    expect(() => Money.of(amount, currency)).toThrow(InvariantViolationError);
  });

  it('adds amounts in the same currency', () => {
    expect(Money.of(150, 'EUR').add(Money.of(50, 'EUR')).equals(Money.of(200, 'EUR'))).toBe(true);
  });

  it('refuses to add amounts in different currencies', () => {
    expect(() => Money.of(1, 'USD').add(Money.of(1, 'EUR'))).toThrow(CurrencyMismatchError);
  });

  it('multiplies by a whole quantity', () => {
    expect(Money.of(250, 'USD').multiply(3).amountMinor).toBe(750);
  });

  it('rejects a multiplication that would overflow safe integers', () => {
    expect(() => Money.of(Number.MAX_SAFE_INTEGER, 'USD').multiply(2)).toThrow(
      InvariantViolationError,
    );
  });
});
