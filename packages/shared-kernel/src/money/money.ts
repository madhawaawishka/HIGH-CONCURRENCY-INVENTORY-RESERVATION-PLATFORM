import { DomainError, InvariantViolationError } from '../errors/domain-error.js';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class CurrencyMismatchError extends DomainError {
  readonly code = 'CURRENCY_MISMATCH';
  readonly kind = 'invalid';

  constructor(left: string, right: string) {
    super(`Cannot combine amounts in ${left} and ${right}.`, { left, right });
  }
}

/**
 * Immutable monetary amount in integer minor units (e.g. cents) plus an ISO 4217 currency.
 * Floating-point numbers are never used for money.
 */
export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {}

  static of(amountMinor: number, currency: string): Money {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      throw new InvariantViolationError(
        'A money amount must be a non-negative whole number of minor units.',
        { amountMinor },
      );
    }
    if (!CURRENCY_PATTERN.test(currency)) {
      throw new InvariantViolationError('A currency must be a three-letter ISO 4217 code.', {
        currency,
      });
    }
    return new Money(amountMinor, currency);
  }

  static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor + other.amountMinor, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isSafeInteger(factor) || factor < 0) {
      throw new InvariantViolationError('A money multiplier must be a non-negative integer.', {
        factor,
      });
    }
    return Money.of(this.amountMinor * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
