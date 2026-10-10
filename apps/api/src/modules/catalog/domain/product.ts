import { InvariantViolationError, type Money } from '@stockforge/shared-kernel';

import { Sku } from './sku.js';

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductState {
  readonly id: string;
  readonly sku: Sku;
  readonly name: string;
  readonly price: Money;
  readonly status: ProductStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NewProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly price: Money;
  readonly now: Date;
}

const MAX_NAME_LENGTH = 200;

/** Catalog entity. Holds product metadata only; stock levels belong to the Inventory module. */
export class Product {
  private constructor(private readonly state: ProductState) {}

  /** Creates a new product, enforcing every creation rule. */
  static create(input: NewProduct): Product {
    const name = input.name.trim();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
      throw new InvariantViolationError(
        `A product name must be between 1 and ${MAX_NAME_LENGTH} characters.`,
      );
    }
    if (input.price.amountMinor <= 0) {
      throw new InvariantViolationError('A product price must be greater than zero.', {
        amountMinor: input.price.amountMinor,
      });
    }
    return new Product({
      id: input.id,
      sku: Sku.of(input.sku),
      name,
      price: input.price,
      status: 'ACTIVE',
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Rebuilds a product from persisted state that was valid when it was stored. */
  static restore(state: ProductState): Product {
    return new Product(state);
  }

  get id(): string {
    return this.state.id;
  }

  get sku(): Sku {
    return this.state.sku;
  }

  get name(): string {
    return this.state.name;
  }

  get price(): Money {
    return this.state.price;
  }

  get status(): ProductStatus {
    return this.state.status;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }

  get updatedAt(): Date {
    return this.state.updatedAt;
  }
}
