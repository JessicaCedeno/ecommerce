/**
 * Tests for src/app/api/proxy/orders/[[...slug]]/route.ts
 * Covers: GET, POST, PATCH, DELETE — same proxy pattern as products
 * @jest-environment node
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/proxy/orders/[[...slug]]/route';

const mockCookies = cookies as jest.Mock;

function makeCookieStore(token?: string) {
  const store = {
    get: jest.fn((name: string) => (name === 'token' && token ? { value: token } : undefined)),
    set: jest.fn(),
    delete: jest.fn(),
  };
  mockCookies.mockResolvedValue(store);
  return store;
}

function makeNextRequest(method: string, path: string, body?: unknown): NextRequest {
  const url = `http://localhost${path}`;
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

function mockUpstream(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('orders proxy — GET', () => {
  it('proxies GET to orders upstream', async () => {
    makeCookieStore();
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/orders');
    const res = await GET(req, { params: Promise.resolve({ slug: [] }) });

    expect(mockFetch.mock.calls[0][0]).toContain('localhost:4000/api/orders');
    expect(res.status).toBe(200);
  });

  it('appends order ID slug to URL', async () => {
    makeCookieStore();
    mockUpstream({});

    const req = makeNextRequest('GET', '/api/proxy/orders/order-123');
    await GET(req, { params: Promise.resolve({ slug: ['order-123'] }) });

    expect(mockFetch.mock.calls[0][0]).toContain('/order-123');
  });

  it('injects Bearer token in Authorization header', async () => {
    makeCookieStore('orders-jwt');
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/orders');
    await GET(req, { params: Promise.resolve({ slug: [] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer orders-jwt' }),
      }),
    );
  });

  it('forwards status filter query param', async () => {
    makeCookieStore();
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/orders?status=PENDING');
    await GET(req, { params: Promise.resolve({ slug: [] }) });

    expect(mockFetch.mock.calls[0][0]).toContain('status=PENDING');
  });

  it('passes 401 upstream status through', async () => {
    makeCookieStore();
    mockUpstream({ message: 'Unauthorized' }, 401);

    const req = makeNextRequest('GET', '/api/proxy/orders');
    const res = await GET(req, { params: Promise.resolve({ slug: [] }) });
    expect(res.status).toBe(401);
  });
});

describe('orders proxy — POST', () => {
  it('creates order by forwarding POST body', async () => {
    makeCookieStore('tok');
    mockUpstream({ id: 'new-order' }, 201);

    const payload = { items: [{ productId: 'p1', quantity: 2 }] };
    const req = makeNextRequest('POST', '/api/proxy/orders', payload);
    const res = await POST(req, { params: Promise.resolve({ slug: [] }) });

    expect(res.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });
});

describe('orders proxy — PATCH', () => {
  it('updates order status', async () => {
    makeCookieStore('tok');
    mockUpstream({ id: 'order-1', status: 'CONFIRMED' });

    const req = makeNextRequest('PATCH', '/api/proxy/orders/order-1', { status: 'CONFIRMED' });
    await PATCH(req, { params: Promise.resolve({ slug: ['order-1'] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/order-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('orders proxy — DELETE', () => {
  it('sends DELETE without body and passes status', async () => {
    makeCookieStore('tok');
    // Use 200 — NextResponse(body, { status: 204 }) is invalid per HTTP spec
    mockFetch.mockResolvedValueOnce({ status: 200, text: jest.fn().mockResolvedValue('') } as unknown as Response);

    const req = makeNextRequest('DELETE', '/api/proxy/orders/order-1');
    const res = await DELETE(req, { params: Promise.resolve({ slug: ['order-1'] }) });

    expect(res.status).toBe(200);
    expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
  });
});
