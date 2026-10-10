import { InvalidSkuError } from './catalog.errors.js';

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,63}$/;

/** Stock keeping unit. Value object: immutable and compared by value. */
export class Sku {
  private constructor(readonly value: string) {}

  static of(value: string): Sku {
    if (!SKU_PATTERN.test(value)) {
      throw new InvalidSkuError(value);
    }
    return new Sku(value);
  }

  equals(other: Sku): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
