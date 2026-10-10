import { isUniqueConstraintViolation, type TransactionClient } from '@stockforge/database';
import { Money } from '@stockforge/shared-kernel';

import type { ProductPage, ProductPageRequest, ProductRepository } from '../application/ports.js';
import { DuplicateSkuError } from '../domain/catalog.errors.js';
import { Product } from '../domain/product.js';
import { Sku } from '../domain/sku.js';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Works with the root client or a transaction client, so the same repository serves reads
 * and transactional writes. Ids are UUIDv7, so ordering by id is ordering by creation time.
 */
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: TransactionClient) {}

  async add(product: Product): Promise<void> {
    try {
      await this.db.product.create({
        data: {
          id: product.id,
          sku: product.sku.value,
          name: product.name,
          priceCents: product.price.amountMinor,
          currency: product.price.currency,
          status: product.status,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateSkuError(product.sku.value);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.db.product.findUnique({ where: { id } });
    return row === null ? null : toDomain(row);
  }

  async listNewestFirst({ limit, afterId }: ProductPageRequest): Promise<ProductPage> {
    // Keyset pagination: "id < last seen id" uses the primary-key index; no OFFSET scan.
    const rows = await this.db.product.findMany({
      ...(afterId === undefined ? {} : { where: { id: { lt: afterId } } }),
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map(toDomain),
      hasMore: rows.length > limit,
    };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.db.product.count({ where: { id } });
    return count > 0;
  }
}

function toDomain(row: ProductRow): Product {
  return Product.restore({
    id: row.id,
    sku: Sku.of(row.sku),
    name: row.name,
    price: Money.of(row.priceCents, row.currency),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
