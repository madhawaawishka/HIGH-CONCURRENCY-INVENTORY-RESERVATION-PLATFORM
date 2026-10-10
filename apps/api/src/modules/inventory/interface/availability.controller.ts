import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityResponse, ProductIdParams } from '@stockforge/contracts';

import { ApiProblems } from '../../../platform/http/api-problems.decorator.js';
import { GetStockLevelHandler } from '../application/get-stock-level.handler.js';
import { toAvailabilityResponse } from './stock-level.presenter.js';

@ApiTags('Inventory')
@Controller({ path: 'products', version: '1' })
export class AvailabilityController {
  constructor(@Inject(GetStockLevelHandler) private readonly getStockLevel: GetStockLevelHandler) {}

  @Get(':productId/availability')
  @ApiOperation({
    summary: 'Get current availability',
    description: 'Informational only: the reservation call is the authoritative stock check.',
  })
  @ApiOkResponse({ standardSchema: AvailabilityResponse })
  @ApiProblems(400, 404)
  async get(
    @Param({ schema: ProductIdParams }) params: ProductIdParams,
  ): Promise<AvailabilityResponse> {
    return toAvailabilityResponse(await this.getStockLevel.execute(params.productId));
  }
}
