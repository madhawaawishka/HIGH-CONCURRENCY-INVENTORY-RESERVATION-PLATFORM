import type { AvailabilityResponse, StockLevelResponse } from '@stockforge/contracts';

import type { StockLevel } from '../domain/stock-level.js';

export function toStockLevelResponse(stock: StockLevel): StockLevelResponse {
  return {
    productId: stock.productId,
    total: stock.total,
    available: stock.available,
    reserved: stock.reserved,
    sold: stock.sold,
    updatedAt: stock.updatedAt?.toISOString() ?? null,
  };
}

/** The public view hides internal buckets (reserved, sold): customers only need availability. */
export function toAvailabilityResponse(stock: StockLevel): AvailabilityResponse {
  return {
    productId: stock.productId,
    available: stock.available,
    inStock: stock.inStock,
  };
}
