/**
 * Tests for src/lib/api/orders.ts
 * Covers: getOrders, getOrder, createOrder, updateOrderStatus
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

const ORDER = {
  id: 'order-uuid-1',
  notes: 'Please deliver fast',
  status: 'PENDING' as const,
  totalAmount: 49.99,
  items: [
    {
      id: 'item-1',
      orderId: 'order-uuid-1',
      productId: 'prod-1',
      productName: 'Widget',
      productPrice: 9.99,
      quantity: 5,
      subtotal: 49.95,
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

describe('orders API — server-side', () => {
  it('getOrders returns list without filter', async () => {
    mockFetch.mockResolvedValueOnce(mockOk([ORDER]));
    const { getOrders } = await import('@/lib/api/orders');
    const result = await getOrders();
    expect(result).toEqual([ORDER]);
    expect(mockFetch.mock.calls[0][0]).toContain('localhost:4000/api/orders');
  });

  it('getOrders passes status filter', async () => {
    mockFetch.mockResolvedValueOnce(mockOk([]));
    const { getOrders } = await import('@/lib/api/orders');
    await getOrders({ status: 'PENDING' });
    expect(mockFetch.mock.calls[0][0]).toContain('status=PENDING');
  });

  it('getOrder fetches single order by ID', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(ORDER));
    const { getOrder } = await import('@/lib/api/orders');
    const result = await getOrder('order-uuid-1');
    expect(result).toEqual(ORDER);
    expect(mockFetch.mock.calls[0][0]).toContain('/order-uuid-1');
  });

  it('createOrder posts with items', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(ORDER));
    const { createOrder } = await import('@/lib/api/orders');
    const payload = { items: [{ productId: 'prod-1', quantity: 5 }] };
    const result = await createOrder(payload);
    expect(result).toEqual(ORDER);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });

  it('updateOrderStatus patches status', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ ...ORDER, status: 'CONFIRMED' }));
    const { updateOrderStatus } = await import('@/lib/api/orders');
    const result = await updateOrderStatus('order-uuid-1', { status: 'CONFIRMED' });
    expect(result.status).toBe('CONFIRMED');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/order-uuid-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('getOrders throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockError(500, 'server failure'));
    const { getOrders } = await import('@/lib/api/orders');
    await expect(getOrders()).rejects.toThrow('Something went wrong');
  });

  it('getOrder throws on 404', async () => {
    mockFetch.mockResolvedValueOnce(mockError(404, 'not found'));
    const { getOrder } = await import('@/lib/api/orders');
    await expect(getOrder('nonexistent')).rejects.toThrow('not found');
  });

  it('createOrder includes Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(ORDER));
    const { createOrder } = await import('@/lib/api/orders');
    await createOrder({ items: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});

describe('orders API — client-side', () => {
  it('uses /api/proxy/orders URL on the client', async () => {
    // @ts-expect-error
    global.window = {};
    process.env.NEXT_PUBLIC_ORDERS_API_URL = 'http://localhost:3000/api/proxy/orders';
    jest.resetModules();
    mockFetch.mockResolvedValueOnce(mockOk([]));
    const { getOrders } = await import('@/lib/api/orders');
    await getOrders();
    expect(mockFetch.mock.calls[0][0]).toContain('/api/proxy/orders');
    // @ts-expect-error
    delete global.window;
    delete process.env.NEXT_PUBLIC_ORDERS_API_URL;
  });
});
