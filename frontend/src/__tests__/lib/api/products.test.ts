/**
 * Tests for src/lib/api/products.ts
 * Covers: getProducts, getProduct, createProduct, updateProduct, deleteProduct
 * Tests both server (window === undefined) and client (window defined) URL resolution
 * @jest-environment node
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOk(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(JSON.stringify({ success: true, data, timestamp: '' })),
    json: jest.fn().mockResolvedValue({ success: true, data, timestamp: '' }),
  } as unknown as Response;
}

function mockError(status: number, text = 'error'): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: jest.fn().mockResolvedValue(text),
    json: jest.fn().mockRejectedValue(new SyntaxError()),
  } as unknown as Response;
}

const PRODUCT = {
  id: 'prod-1',
  name: 'Widget',
  description: 'A widget',
  price: 9.99,
  stock: 10,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

describe('products API — server-side URLs', () => {
  // In @jest-environment node, window is always undefined — no setup needed

  it('getProducts calls correct URL with no params', async () => {
    mockFetch.mockResolvedValueOnce(mockOk([PRODUCT]));
    const { getProducts } = await import('@/lib/api/products');
    const result = await getProducts();
    expect(result).toEqual([PRODUCT]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('localhost:4000/api/products'),
      expect.anything(),
    );
  });

  it('getProducts passes search param', async () => {
    mockFetch.mockResolvedValueOnce(mockOk([PRODUCT]));
    const { getProducts } = await import('@/lib/api/products');
    await getProducts({ search: 'widget' });
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('search=widget');
  });

  it('getProducts passes isActive param', async () => {
    mockFetch.mockResolvedValueOnce(mockOk([]));
    const { getProducts } = await import('@/lib/api/products');
    await getProducts({ isActive: true });
    expect(mockFetch.mock.calls[0][0]).toContain('isActive=true');
  });

  it('getProduct fetches by ID', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(PRODUCT));
    const { getProduct } = await import('@/lib/api/products');
    const result = await getProduct('prod-1');
    expect(result).toEqual(PRODUCT);
    expect(mockFetch.mock.calls[0][0]).toContain('/prod-1');
  });

  it('createProduct posts JSON body', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(PRODUCT));
    const { createProduct } = await import('@/lib/api/products');
    const payload = { name: 'Widget', price: 9.99, stock: 10 };
    const result = await createProduct(payload);
    expect(result).toEqual(PRODUCT);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('updateProduct patches by ID', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ ...PRODUCT, price: 19.99 }));
    const { updateProduct } = await import('@/lib/api/products');
    const result = await updateProduct('prod-1', { price: 19.99 });
    expect(result.price).toBe(19.99);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/prod-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deleteProduct calls DELETE and resolves void on 204', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, text: jest.fn() } as unknown as Response);
    const { deleteProduct } = await import('@/lib/api/products');
    await expect(deleteProduct('prod-1')).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/prod-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('deleteProduct throws on error', async () => {
    mockFetch.mockResolvedValueOnce(mockError(404, 'Not found'));
    const { deleteProduct } = await import('@/lib/api/products');
    await expect(deleteProduct('missing')).rejects.toThrow('Not found');
  });

  it('getProducts throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockError(500, 'server error'));
    const { getProducts } = await import('@/lib/api/products');
    await expect(getProducts()).rejects.toThrow('Something went wrong');
  });
});

describe('products API — client-side URLs', () => {
  it('uses /api/proxy/products URL on the client', async () => {
    // Simulate browser environment — set window AND an absolute NEXT_PUBLIC URL
    // so that new URL(BASE_URL) doesn't fail on a relative path
    // @ts-expect-error
    global.window = {};
    process.env.NEXT_PUBLIC_PRODUCTS_API_URL = 'http://localhost:3000/api/proxy/products';
    jest.resetModules();
    mockFetch.mockResolvedValueOnce(mockOk([PRODUCT]));
    const { getProducts } = await import('@/lib/api/products');
    await getProducts();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/proxy/products');
    // @ts-expect-error
    delete global.window;
    delete process.env.NEXT_PUBLIC_PRODUCTS_API_URL;
  });
});
