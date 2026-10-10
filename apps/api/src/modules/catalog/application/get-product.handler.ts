import { ProductNotFoundError } from '../domain/catalog.errors.js';
import type { Product } from '../domain/product.js';
import type { ProductRepository } from './ports.js';

export class GetProductHandler {
  constructor(private readonly products: ProductRepository) {}

  async execute(productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    if (product === null) {
      throw new ProductNotFoundError(productId);
    }
    return product;
  }
}
