import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const PRODUCTS_URL = process.env.PRODUCTS_SERVICE_URL ?? 'http://products-service:3001';

const createProductSchema = { type: 'object', required: ['name', 'price', 'stock'], properties: { name: { type: 'string', example: 'Laptop Pro 15' }, description: { type: 'string', example: 'High performance laptop' }, price: { type: 'number', example: 1299.99 }, stock: { type: 'integer', example: 50 } } };
const updateProductSchema = { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, stock: { type: 'integer' }, isActive: { type: 'boolean' } } };

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsProxyController {
  constructor(private readonly http: HttpService) {}

  private async proxy(method: string, path: string, res: Response, xUser?: string, data?: unknown) {
    try {
      const headers: Record<string, string> = {};
      if (xUser) headers['X-User'] = xUser;
      const r = await firstValueFrom(this.http.request({ method, url: `${PRODUCTS_URL}/api${path}`, data, headers }));
      return res.status(r.status).json(r.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown } };
      const status = e?.response?.status ?? HttpStatus.BAD_GATEWAY;
      return res.status(status).json(e?.response?.data ?? { message: 'Bad gateway' });
    }
  }

  @Get() @ApiOperation({ summary: 'List products' })
  findAll(@Query() _q: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('GET', `/products?${req.url.split('?')[1] ?? ''}`, res, xUser);
  }

  @Post() @ApiOperation({ summary: 'Create product' }) @ApiBody({ schema: createProductSchema })
  create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('POST', '/products', res, xUser, body);
  }

  @Get(':id') @ApiOperation({ summary: 'Get product' })
  findOne(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('GET', `/products/${id}`, res, xUser);
  }

  @Patch(':id') @ApiOperation({ summary: 'Update product' }) @ApiBody({ schema: updateProductSchema })
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('PATCH', `/products/${id}`, res, xUser, body);
  }

  @Delete(':id') @ApiOperation({ summary: 'Delete product' })
  remove(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const xUser = (req as Request & { user?: { sub: string; email: string } }).user
      ? JSON.stringify((req as Request & { user?: { sub: string; email: string } }).user)
      : undefined;
    return this.proxy('DELETE', `/products/${id}`, res, xUser);
  }
}
