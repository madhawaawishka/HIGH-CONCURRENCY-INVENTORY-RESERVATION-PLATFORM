import { Money, type Clock, type IdGenerator } from '@stockforge/shared-kernel';

import { Product } from '../domain/product.js';
import type { CatalogUnitOfWork } from './ports.js';

export interface CreateProductCommand {
  readonly sku: string;
  readonly name: string;
  readonly priceMinor: number;
  readonly currency: string;
  /** Who is creating the product (recorded in the audit log). */
  readonly actorId: string;
}

export class CreateProductHandler {
  constructor(
    private readonly unitOfWork: CatalogUnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * SKU uniqueness is enforced by the database's unique index rather than a "check, then
   * insert" query, which would race when two requests create the same SKU concurrently.
   */
  async execute(command: CreateProductCommand): Promise<Product> {
    const product = Product.create({
      id: this.ids.next(),
      sku: command.sku,
      name: command.name,
      price: Money.of(command.priceMinor, command.currency),
      now: this.clock.now(),
    });

    await this.unitOfWork.run(async (tx) => {
      await tx.products.add(product);
      await tx.auditLog.record({
        actorId: command.actorId,
        action: 'PRODUCT_CREATED',
        aggregateType: 'product',
        aggregateId: product.id,
        metadata: {
          sku: product.sku.value,
          priceMinor: product.price.amountMinor,
          currency: product.price.currency,
        },
      });
    });
    return product;
  }
}
