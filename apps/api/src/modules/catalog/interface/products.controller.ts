import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdParams, PageQuery, ProductPageResponse, ProductResponse } from '@stockforge/contracts';
import { z } from 'zod';

import { ApiProblems } from '../../../platform/http/api-problems.decorator.js';
import { decodeCursor } from '../../../platform/http/cursor.js';
import { GetProductHandler } from '../application/get-product.handler.js';
import { ListProductsHandler } from '../application/list-products.handler.js';
import { toProductPageResponse, toProductResponse } from './product.presenter.js';

const ProductCursor = z.object({ id: z.uuid() });

@ApiTags('Catalog')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    @Inject(GetProductHandler) private readonly getProduct: GetProductHandler,
    @Inject(ListProductsHandler) private readonly listProducts: ListProductsHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products, newest first (cursor pagination)' })
  @ApiOkResponse({ standardSchema: ProductPageResponse })
  @ApiProblems(400)
  async list(@Query({ schema: PageQuery }) query: PageQuery): Promise<ProductPageResponse> {
    const afterId =
      query.cursor === undefined ? undefined : decodeCursor(query.cursor, ProductCursor).id;
    const page = await this.listProducts.execute({
      limit: query.limit,
      ...(afterId === undefined ? {} : { afterId }),
    });
    return toProductPageResponse(page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product' })
  @ApiOkResponse({ standardSchema: ProductResponse })
  @ApiProblems(400, 404)
  async get(@Param({ schema: IdParams }) params: IdParams): Promise<ProductResponse> {
    return toProductResponse(await this.getProduct.execute(params.id));
  }
}
