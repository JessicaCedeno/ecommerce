import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

/** Escape PostgreSQL LIKE special characters to prevent pattern injection. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(@InjectRepository(Product) private readonly productRepository: Repository<Product>) {}

  async findAll(query: QueryProductDto): Promise<Product[]> {
    const isActive = query.isActive !== undefined ? query.isActive : true;
    if (query.search) {
      const safe = escapeLike(query.search);
      return this.productRepository.find({ where: { name: Like(`%${safe}%`), isActive }, order: { createdAt: 'DESC' } });
    }
    return this.productRepository.find({ where: { isActive }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id, isActive: true } });
    if (!product) throw new NotFoundException(`Product with id "${id}" not found`);
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    const saved = await this.productRepository.save(product);
    this.logger.log(`Product created: ${saved.id}`);
    return saved;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.save({ ...product, isActive: false });
    this.logger.log(`Product soft-deleted: ${id}`);
  }

  /**
   * Atomically decrement stock by `quantity`.
   * Uses a single UPDATE … WHERE stock >= quantity so concurrent requests
   * cannot oversell: only one wins when stock reaches 0.
   */
  async reserveStock(id: string, quantity: number): Promise<Product> {
    const result = await this.productRepository
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :id AND stock >= :quantity AND "isActive" = true', { id, quantity })
      .returning('*')
      .execute();

    if (result.affected === 0) {
      // Distinguish root cause internally for logging, expose a generic message to the client
      const product = await this.productRepository.findOne({ where: { id } });
      if (!product) {
        this.logger.warn(`Reserve attempt on non-existent product ${id}`);
        throw new NotFoundException(`Product ${id} not found`);
      }
      if (!product.isActive) {
        this.logger.warn(`Reserve attempt on inactive product ${id}`);
        throw new BadRequestException(`Product ${id} is not available`);
      }
      this.logger.warn(`Insufficient stock for product ${id}: requested ${quantity}, available ${product.stock}`);
      throw new ConflictException(`Insufficient stock for product ${id}`);
    }

    this.logger.log(`Reserved ${quantity} units of product ${id}`);
    return result.raw[0] as Product;
  }

  /**
   * Release previously reserved stock (rollback path).
   * Simply increments stock — never throws.
   */
  async releaseStock(id: string, quantity: number): Promise<void> {
    await this.productRepository
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock + ${quantity}` })
      .where('id = :id', { id })
      .execute();
    this.logger.log(`Released ${quantity} units of product ${id}`);
  }
}
