import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ServiceUnavailableException, ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ProductsClientService } from './products-client.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './enums/order-status.enum';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-uuid-1',
  status: OrderStatus.PENDING,
  totalAmount: 199.98,
  notes: null,
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeProduct = (overrides = {}) => ({
  id: 'prod-uuid-1',
  name: 'Laptop',
  price: 99.99,
  stock: 10,
  isActive: true,
  ...overrides,
});

const makeQueryRunner = (overrides: Record<string, jest.Mock> = {}) => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn(),
    save: jest.fn(),
  },
  ...overrides,
});

const mockOrderRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
const mockProductsClient = {
  getProduct: jest.fn(),
  reserveStock: jest.fn(),
  releaseStock: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;
  let mockQR: ReturnType<typeof makeQueryRunner>;

  beforeEach(async () => {
    mockQR = makeQueryRunner();
    const mockDataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQR) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: ProductsClientService, useValue: mockProductsClient },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all orders with no filter', async () => {
      mockOrderRepo.find.mockResolvedValue([makeOrder()]);
      const result = await service.findAll({});
      expect(mockOrderRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toHaveLength(1);
    });

    it('filters orders by status', async () => {
      mockOrderRepo.find.mockResolvedValue([makeOrder({ status: OrderStatus.CONFIRMED })]);
      await service.findAll({ status: OrderStatus.CONFIRMED });
      expect(mockOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: OrderStatus.CONFIRMED } }),
      );
    });

    it('returns empty array when no orders match', async () => {
      mockOrderRepo.find.mockResolvedValue([]);
      expect(await service.findAll({ status: OrderStatus.CANCELLED })).toEqual([]);
    });

    it('propagates database errors', async () => {
      mockOrderRepo.find.mockRejectedValue(new Error('DB timeout'));
      await expect(service.findAll({})).rejects.toThrow('DB timeout');
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('returns an order when found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder());
      const result = await service.findOne('order-uuid-1');
      expect(result.id).toBe('order-uuid-1');
    });

    it('throws NotFoundException when order does not exist', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('includes the id in the NotFoundException message', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ghost-id')).rejects.toThrow('ghost-id');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { items: [{ productId: 'prod-uuid-1', quantity: 2 }] };

    it('creates an order and commits the transaction', async () => {
      const product = makeProduct();
      const savedOrder = makeOrder({ totalAmount: product.price * 2 });
      mockProductsClient.reserveStock.mockResolvedValue(product);
      mockQR.manager.create.mockReturnValue({});
      mockQR.manager.save.mockResolvedValue(savedOrder);

      const result = await service.create(dto);

      expect(mockQR.connect).toHaveBeenCalled();
      expect(mockQR.startTransaction).toHaveBeenCalled();
      expect(mockQR.commitTransaction).toHaveBeenCalled();
      expect(mockQR.release).toHaveBeenCalled();
      expect(mockQR.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.totalAmount).toBe(savedOrder.totalAmount);
    });

    it('calculates totalAmount correctly across multiple items', async () => {
      const dto2 = {
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 3 },
        ],
      };
      mockProductsClient.reserveStock
        .mockResolvedValueOnce(makeProduct({ id: 'prod-1', price: 10 }))
        .mockResolvedValueOnce(makeProduct({ id: 'prod-2', price: 20 }));

      let capturedOrder: unknown;
      mockQR.manager.create.mockImplementation((_entity: unknown, data: unknown) => data);
      mockQR.manager.save.mockImplementation((_entity: unknown, data: unknown) => {
        capturedOrder = data;
        return Promise.resolve({ ...makeOrder(), ...(data as object) });
      });

      await service.create(dto2);
      // 2×10 + 3×20 = 80
      expect((capturedOrder as Order).totalAmount).toBe(80);
    });

    it('throws BadRequestException when product is inactive', async () => {
      mockProductsClient.reserveStock.mockRejectedValue(
        new BadRequestException('Product prod-uuid-1 is not active'),
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockQR.rollbackTransaction).toHaveBeenCalled();
      expect(mockQR.commitTransaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when stock is insufficient', async () => {
      mockProductsClient.reserveStock.mockRejectedValue(
        new ConflictException('Insufficient stock for product prod-uuid-1'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockQR.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when product is not found', async () => {
      mockProductsClient.reserveStock.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockQR.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when products-service is down', async () => {
      mockProductsClient.reserveStock.mockRejectedValue(
        new ServiceUnavailableException('Products service is unavailable'),
      );

      await expect(service.create(dto)).rejects.toThrow(ServiceUnavailableException);
      expect(mockQR.rollbackTransaction).toHaveBeenCalled();
    });

    it('always releases the query runner even on error', async () => {
      mockProductsClient.reserveStock.mockRejectedValue(new Error('unexpected'));

      await expect(service.create(dto)).rejects.toThrow();
      expect(mockQR.release).toHaveBeenCalled();
    });

    it('releases reserved stock for already-reserved items when a later item fails', async () => {
      const dto2 = {
        items: [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 2 },
        ],
      };
      mockProductsClient.reserveStock
        .mockResolvedValueOnce(makeProduct({ id: 'prod-1', price: 10 }))
        .mockRejectedValueOnce(new ConflictException('Insufficient stock'));
      mockQR.manager.create.mockReturnValue({});

      await expect(service.create(dto2)).rejects.toThrow(ConflictException);
      expect(mockProductsClient.releaseStock).toHaveBeenCalledWith('prod-1', 1);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates order status', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING });
      const updated = makeOrder({ status: OrderStatus.CONFIRMED });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(updated);

      const result = await service.update('order-uuid-1', { status: OrderStatus.CONFIRMED });
      expect(mockOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('throws NotFoundException when order does not exist', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.update('ghost-id', { status: OrderStatus.CANCELLED })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not call save when order is not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.update('ghost-id', {})).rejects.toThrow();
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('releases stock for each item when order is cancelled', async () => {
      const items = [
        { productId: 'prod-1', quantity: 2, productName: 'A', productPrice: 10, subtotal: 20 },
        { productId: 'prod-2', quantity: 1, productName: 'B', productPrice: 50, subtotal: 50 },
      ];
      const order = makeOrder({ status: OrderStatus.PENDING, items: items as OrderItem[] });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });
      mockProductsClient.releaseStock.mockResolvedValue(undefined);

      await service.update('order-uuid-1', { status: OrderStatus.CANCELLED });

      expect(mockProductsClient.releaseStock).toHaveBeenCalledWith('prod-1', 2);
      expect(mockProductsClient.releaseStock).toHaveBeenCalledWith('prod-2', 1);
      expect(mockProductsClient.releaseStock).toHaveBeenCalledTimes(2);
    });

    it('does not release stock when cancelling an already-cancelled order', async () => {
      const order = makeOrder({ status: OrderStatus.CANCELLED, items: [] });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      await service.update('order-uuid-1', { status: OrderStatus.CANCELLED });

      expect(mockProductsClient.releaseStock).not.toHaveBeenCalled();
    });

    it('does not release stock when updating to a non-cancelled status', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING, items: [] });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue({ ...order, status: OrderStatus.CONFIRMED });

      await service.update('order-uuid-1', { status: OrderStatus.CONFIRMED });

      expect(mockProductsClient.releaseStock).not.toHaveBeenCalled();
    });
  });
});
