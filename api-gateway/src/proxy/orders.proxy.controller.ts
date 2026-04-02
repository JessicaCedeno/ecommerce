import { Controller, Get, Post, Patch, Param, Body, Query, Req, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ORDERS_URL = process.env.ORDERS_SERVICE_URL ?? 'http://orders-service:3002';

const createOrderSchema = { type: 'object', required: ['items'], properties: { notes: { type: 'string', example: 'Please deliver before noon' }, items: { type: 'array', items: { type: 'object', required: ['productId', 'quantity'], properties: { productId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' }, quantity: { type: 'integer', minimum: 1, example: 2 } } } } } };
const updateOrderSchema = { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] } } };

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersProxyController {
  constructor(private readonly http: HttpService) {}

  private async proxy(method: string, path: string, res: Response, xUser?: string, data?: unknown) {
    try {
      const headers: Record<string, string> = {};
      if (xUser) headers['X-User'] = xUser;
      const r = await firstValueFrom(this.http.request({ method, url: `${ORDERS_URL}/api${path}`, data, headers }));
      return res.status(r.status).json(r.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown } };
      const status = e?.response?.status ?? HttpStatus.BAD_GATEWAY;
      return res.status(status).json(e?.response?.data ?? { message: 'Bad gateway' });
    }
  }

  @Get() @ApiOperation({ summary: 'List orders' })
  findAll(@Query() _q: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('GET', `/orders?${req.url.split('?')[1] ?? ''}`, res, xUser);
  }

  @Post() @ApiOperation({ summary: 'Create order' }) @ApiBody({ schema: createOrderSchema })
  create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('POST', '/orders', res, xUser, body);
  }

  @Get(':id') @ApiOperation({ summary: 'Get order' })
  findOne(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('GET', `/orders/${id}`, res, xUser);
  }

  @Patch(':id') @ApiOperation({ summary: 'Update order status' }) @ApiBody({ schema: updateOrderSchema })
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('PATCH', `/orders/${id}`, res, xUser, body);
  }
}
