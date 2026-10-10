import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdjustStockRequest, ProductIdParams, StockLevelResponse } from '@stockforge/contracts';

import { ADMIN_API_KEY_ACTOR, AdminOnly } from '../../../platform/http/admin-api-key.guard.js';
import { ApiProblems } from '../../../platform/http/api-problems.decorator.js';
import { AdjustStockHandler } from '../application/adjust-stock.handler.js';
import { GetStockLevelHandler } from '../application/get-stock-level.handler.js';
import { toStockLevelResponse } from './stock-level.presenter.js';

@ApiTags('Admin: Inventory')
@AdminOnly()
@Controller({ path: 'admin/inventory', version: '1' })
export class AdminInventoryController {
  constructor(
    @Inject(GetStockLevelHandler) private readonly getStockLevel: GetStockLevelHandler,
    @Inject(AdjustStockHandler) private readonly adjustStock: AdjustStockHandler,
  ) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Get the full stock breakdown of a product' })
  @ApiOkResponse({ standardSchema: StockLevelResponse })
  @ApiProblems(400, 404)
  async get(
    @Param({ schema: ProductIdParams }) params: ProductIdParams,
  ): Promise<StockLevelResponse> {
    return toStockLevelResponse(await this.getStockLevel.execute(params.productId));
  }

  @Post(':productId/adjustments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restock (positive delta) or write off (negative delta) units' })
  @ApiOkResponse({ standardSchema: StockLevelResponse })
  @ApiProblems(400, 404, 409, 422)
  async adjust(
    @Param({ schema: ProductIdParams }) params: ProductIdParams,
    @Body({ schema: AdjustStockRequest }) body: AdjustStockRequest,
  ): Promise<StockLevelResponse> {
    const stock = await this.adjustStock.execute({
      productId: params.productId,
      delta: body.delta,
      reason: body.reason,
      actorId: ADMIN_API_KEY_ACTOR,
    });
    return toStockLevelResponse(stock);
  }
}
