import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProductRequest, ProductResponse } from '@stockforge/contracts';
import type { Response } from 'express';

import { ADMIN_API_KEY_ACTOR, AdminOnly } from '../../../platform/http/admin-api-key.guard.js';
import { ApiProblems } from '../../../platform/http/api-problems.decorator.js';
import { CreateProductHandler } from '../application/create-product.handler.js';
import { toProductResponse } from './product.presenter.js';

@ApiTags('Admin: Catalog')
@AdminOnly()
@Controller({ path: 'admin/products', version: '1' })
export class AdminProductsController {
  constructor(@Inject(CreateProductHandler) private readonly createProduct: CreateProductHandler) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ standardSchema: ProductResponse })
  @ApiProblems(400, 409, 422)
  async create(
    @Body({ schema: CreateProductRequest }) body: CreateProductRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ProductResponse> {
    const product = await this.createProduct.execute({
      sku: body.sku,
      name: body.name,
      priceMinor: body.price.amountMinor,
      currency: body.price.currency,
      actorId: ADMIN_API_KEY_ACTOR,
    });
    response.location(`/v1/products/${product.id}`);
    return toProductResponse(product);
  }
}
