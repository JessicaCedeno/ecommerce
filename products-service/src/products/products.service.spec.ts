import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'uuid-1',
  name: 'Test Product',
  description: 'A description',
  price: 99.99,
  stock: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns active products by default', async () => {
      mockRepo.find.mockResolvedValue([makeProduct()]);
      const result = await service.findAll({});
      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
      expect(result).toHaveLength(1);
    });

    it('returns inactive products when isActive=false is passed', async () => {
      const inactive = makeProduct({ isActive: false });
      mockRepo.find.mockResolvedValue([inactive]);
      await service.findAll({ isActive: false });
      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: false } }));
    });

    it('applies search filter on name', async () => {
      mockRepo.find.mockResolvedValue([makeProduct()]);
      await service.findAll({ search: 'laptop' });
      const callArg = mockRepo.find.mock.calls[0][0];
      expect(callArg.where.name.value).toContain('laptop');
    });

    it('returns empty array when no products match', async () => {
      mockRepo.find.mockResolvedValue([]);
      expect(await service.findAll({ search: 'nonexistent' })).toEqual([]);
    });

    it('propagates database errors', async () => {
      mockRepo.find.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.findAll({})).rejects.toThrow('DB connection lost');
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('returns a product when found and active', async () => {
      mockRepo.findOne.mockResolvedValue(makeProduct());
      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('filters by isActive:true when looking up by id', async () => {
      mockRepo.findOne.mockResolvedValue(makeProduct());
      await service.findOne('uuid-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1', isActive: true } });
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a soft-deleted product', async () => {
      // soft-deleted products have isActive:false — findOne with isActive:true returns null
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('deleted-uuid')).rejects.toThrow(
        'Product with id "deleted-uuid" not found',
      );
    });

    it('propagates unexpected database errors', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('timeout'));
      await expect(service.findOne('uuid-1')).rejects.toThrow('timeout');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates and returns a product', async () => {
      const product = makeProduct();
      mockRepo.create.mockReturnValue(product);
      mockRepo.save.mockResolvedValue(product);
      const result = await service.create({ name: 'Test Product', price: 99.99, stock: 10 });
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Test Product', price: 99.99, stock: 10 });
      expect(mockRepo.save).toHaveBeenCalledWith(product);
      expect(result).toEqual(product);
    });

    it('creates a product with optional description', async () => {
      const product = makeProduct({ description: 'Nice item' });
      mockRepo.create.mockReturnValue(product);
      mockRepo.save.mockResolvedValue(product);
      const result = await service.create({ name: 'Test', price: 10, stock: 5, description: 'Nice item' });
      expect(result.description).toBe('Nice item');
    });

    it('propagates save errors (e.g. unique constraint)', async () => {
      mockRepo.create.mockReturnValue(makeProduct());
      mockRepo.save.mockRejectedValue(new Error('duplicate key value'));
      await expect(service.create({ name: 'Dup', price: 1, stock: 1 })).rejects.toThrow('duplicate key value');
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates and returns modified product', async () => {
      const original = makeProduct({ price: 50 });
      const updated = makeProduct({ price: 75 });
      mockRepo.findOne.mockResolvedValue(original);
      mockRepo.save.mockResolvedValue(updated);
      const result = await service.update('uuid-1', { price: 75 });
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ price: 75 }));
      expect(result.price).toBe(75);
    });

    it('throws NotFoundException when updating non-existent product', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update('ghost-id', { price: 10 })).rejects.toThrow(NotFoundException);
    });

    it('allows partial updates (only provided fields change)', async () => {
      const original = makeProduct({ name: 'Old Name', stock: 5 });
      mockRepo.findOne.mockResolvedValue(original);
      mockRepo.save.mockImplementation((p: Product) => Promise.resolve(p));
      const result = await service.update('uuid-1', { stock: 20 });
      expect(result.name).toBe('Old Name');
      expect(result.stock).toBe(20);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('soft-deletes by setting isActive to false', async () => {
      mockRepo.findOne.mockResolvedValue(makeProduct());
      mockRepo.save.mockResolvedValue(makeProduct({ isActive: false }));
      await service.remove('uuid-1');
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('does not call save if product is not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('ghost-id')).rejects.toThrow();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
