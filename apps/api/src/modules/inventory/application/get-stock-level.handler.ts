import { UnknownProductError } from '../domain/inventory.errors.js';
import { StockLevel } from '../domain/stock-level.js';
import type { ProductCatalog, StockLevelRepository } from './ports.js';

export class GetStockLevelHandler {
  constructor(
    private readonly stock: StockLevelRepository,
    private readonly catalog: ProductCatalog,
  ) {}

  /** A catalog product without recorded stock has zero units, rather than being "not found". */
  async execute(productId: string): Promise<StockLevel> {
    const stock = await this.stock.find(productId);
    if (stock !== null) {
      return stock;
    }
    if (!(await this.catalog.productExists(productId))) {
      throw new UnknownProductError(productId);
    }
    return StockLevel.empty(productId);
  }
}
