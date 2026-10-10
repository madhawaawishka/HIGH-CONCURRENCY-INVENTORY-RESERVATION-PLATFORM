import type { ProductPage, ProductPageRequest, ProductRepository } from './ports.js';

export class ListProductsHandler {
  constructor(private readonly products: ProductRepository) {}

  execute(request: ProductPageRequest): Promise<ProductPage> {
    return this.products.listNewestFirst(request);
  }
}
