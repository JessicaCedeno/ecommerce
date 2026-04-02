import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { Order } from './order.entity';

const uuidPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('id must be a valid UUID v4'),
});

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get() @ApiOperation({ summary: 'List orders' })
  findAll(@Query() query: QueryOrderDto): Promise<Order[]> { return this.ordersService.findAll(query); }

  @Post() @HttpCode(HttpStatus.CREATED) @ApiOperation({ summary: 'Create order' }) @ApiResponse({ status: 201 }) @ApiResponse({ status: 400 })
  create(@Body() dto: CreateOrderDto): Promise<Order> { return this.ordersService.create(dto); }

  @Get(':id') @ApiOperation({ summary: 'Get order by ID' }) @ApiParam({ name: 'id', type: 'string', format: 'uuid' }) @ApiResponse({ status: 400, description: 'Invalid UUID' }) @ApiResponse({ status: 404 })
  findOne(@Param('id', uuidPipe) id: string): Promise<Order> { return this.ordersService.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Update order status' }) @ApiParam({ name: 'id', type: 'string', format: 'uuid' }) @ApiResponse({ status: 400, description: 'Invalid UUID' })
  update(@Param('id', uuidPipe) id: string, @Body() dto: UpdateOrderDto): Promise<Order> { return this.ordersService.update(id, dto); }
}
