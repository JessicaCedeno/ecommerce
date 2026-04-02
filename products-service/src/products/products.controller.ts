import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { Product } from './product.entity';

const uuidPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('id must be a valid UUID v4'),
});

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get() @ApiOperation({ summary: 'List products' }) @ApiResponse({ status: 200 })
  findAll(@Query() query: QueryProductDto): Promise<Product[]> { return this.productsService.findAll(query); }

  @Post() @HttpCode(HttpStatus.CREATED) @ApiOperation({ summary: 'Create product' }) @ApiResponse({ status: 201 }) @ApiResponse({ status: 400 })
  create(@Body() dto: CreateProductDto): Promise<Product> { return this.productsService.create(dto); }

  @Get(':id') @ApiOperation({ summary: 'Get product by ID' }) @ApiParam({ name: 'id', type: 'string', format: 'uuid' }) @ApiResponse({ status: 200 }) @ApiResponse({ status: 400, description: 'Invalid UUID' }) @ApiResponse({ status: 404 })
  findOne(@Param('id', uuidPipe) id: string): Promise<Product> { return this.productsService.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Update product' }) @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id', uuidPipe) id: string, @Body() dto: UpdateProductDto): Promise<Product> { return this.productsService.update(id, dto); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Soft-delete product' }) @ApiParam({ name: 'id', type: 'string', format: 'uuid' }) @ApiResponse({ status: 204 })
  remove(@Param('id', uuidPipe) id: string): Promise<void> { return this.productsService.remove(id); }

  @Post(':id/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically reserve (decrement) stock — internal use by orders-service' })
  @ApiResponse({ status: 200, description: 'Stock reserved, returns updated product' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  reserveStock(@Param('id', uuidPipe) id: string, @Body() dto: ReserveStockDto): Promise<Product> {
    return this.productsService.reserveStock(id, dto.quantity);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release (increment) stock — rollback path for failed orders' })
  @ApiResponse({ status: 200 })
  releaseStock(@Param('id', uuidPipe) id: string, @Body() dto: ReserveStockDto): Promise<void> {
    return this.productsService.releaseStock(id, dto.quantity);
  }
}
