import { Injectable, NotFoundException, ServiceUnavailableException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductDto { id: string; name: string; price: number; stock: number; isActive: boolean; }

@Injectable()
export class ProductsClientService {
  private readonly logger = new Logger(ProductsClientService.name);
  private readonly baseUrl = process.env.PRODUCTS_SERVICE_URL ?? 'http://products-service:3001';

  constructor(private readonly httpService: HttpService) {}

  async getProduct(productId: string): Promise<ProductDto> {
    try {
      const response = await firstValueFrom(this.httpService.get<{ data: ProductDto }>(`${this.baseUrl}/api/products/${productId}`));
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) throw new NotFoundException(`Product ${productId} not found`);
      this.logger.error(`Products service unreachable: ${err}`);
      throw new ServiceUnavailableException('Products service is unavailable');
    }
  }

  /**
   * Atomically reserve `quantity` units of a product.
   * The products-service performs a single UPDATE WHERE stock >= quantity,
   * so concurrent calls are safe — only one wins when stock is exhausted.
   */
  async reserveStock(productId: string, quantity: number): Promise<ProductDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ data: ProductDto }>(
          `${this.baseUrl}/api/products/${productId}/reserve`,
          { quantity },
        ),
      );
      return response.data.data ?? (response.data as unknown as ProductDto);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosErr?.response?.status;
      const message = axiosErr?.response?.data?.message;
      if (status === 404) throw new NotFoundException(`Product ${productId} not found`);
      if (status === 400) throw new BadRequestException(message ?? `Product ${productId} is not active`);
      if (status === 409) throw new ConflictException(message ?? `Insufficient stock for product ${productId}`);
      this.logger.error(`Products service error reserving stock: ${err}`);
      throw new ServiceUnavailableException('Products service is unavailable');
    }
  }

  /** Release previously reserved stock (called on order rollback). */
  async releaseStock(productId: string, quantity: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/products/${productId}/release`, { quantity }),
      );
    } catch (err: unknown) {
      // Best-effort — log but do not throw so the caller's error is not masked
      this.logger.error(`Failed to release stock for product ${productId}: ${err}`);
    }
  }
}
