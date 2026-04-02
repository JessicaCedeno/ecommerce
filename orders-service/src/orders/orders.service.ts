import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './enums/order-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ProductsClientService } from './products-client.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly productsClient: ProductsClientService,
  ) {}

  findAll(query: QueryOrderDto): Promise<Order[]> {
    const where = query.status ? { status: query.status } : {};
    return this.orderRepository.find({ where, order: { createdAt: 'DESC' }, relations: ['items'] });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    // Track which products had stock reserved so we can roll back on error
    const reserved: Array<{ productId: string; quantity: number }> = [];

    try {
      let total = 0;
      const items: OrderItem[] = [];

      for (const itemDto of dto.items) {
        // reserveStock atomically validates AND decrements in one DB UPDATE.
        // If two concurrent requests race for the last unit, only one succeeds.
        const product = await this.productsClient.reserveStock(itemDto.productId, itemDto.quantity);
        reserved.push({ productId: product.id, quantity: itemDto.quantity });

        const subtotal = Number(product.price) * itemDto.quantity;
        total += subtotal;
        const item = qr.manager.create(OrderItem, {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: itemDto.quantity,
          subtotal,
        });
        items.push(item);
      }

      const order = qr.manager.create(Order, { notes: dto.notes, totalAmount: total, items });
      const saved = await qr.manager.save(Order, order);
      await qr.commitTransaction();
      this.logger.log(`Order created: ${saved.id}`);
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();

      // Release any stock already reserved before the failure
      await Promise.all(
        reserved.map(({ productId, quantity }) =>
          this.productsClient.releaseStock(productId, quantity),
        ),
      );

      throw err;
    } finally {
      await qr.release();
    }
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;
    Object.assign(order, dto);
    const saved = await this.orderRepository.save(order);

    // When an order is cancelled, release the reserved stock back to products-service
    if (dto.status === OrderStatus.CANCELLED && previousStatus !== OrderStatus.CANCELLED) {
      await Promise.all(
        order.items.map(({ productId, quantity }) =>
          this.productsClient.releaseStock(productId, quantity),
        ),
      );
      this.logger.log(`Stock released for cancelled order ${id}`);
    }

    return saved;
  }
}
