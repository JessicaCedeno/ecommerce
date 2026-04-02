/**
 * Tests for src/app/api/proxy/products/[[...slug]]/route.ts
 * Covers: GET, POST, PATCH, DELETE — URL building, auth header, body forwarding, status passthrough
 * @jest-environment node
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/proxy/products/[[...slug]]/route';

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

describe('products proxy — GET', () => {
  it('proxies GET to upstream URL', async () => {
    makeCookieStore();
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/products');
    const res = await GET(req, { params: Promise.resolve({ slug: [] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('localhost:4000/api/products'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(res.status).toBe(200);
  });

  it('appends slug to upstream URL', async () => {
    makeCookieStore();
    mockUpstream({});

    const req = makeNextRequest('GET', '/api/proxy/products/prod-123');
    await GET(req, { params: Promise.resolve({ slug: ['prod-123'] }) });

    expect(mockFetch.mock.calls[0][0]).toContain('/prod-123');
  });

  it('injects Authorization header when token present', async () => {
    makeCookieStore('jwt-token');
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/products');
    await GET(req, { params: Promise.resolve({ slug: [] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      }),
    );
  });

  it('does not inject Authorization header when no token', async () => {
    makeCookieStore(); // no token
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/products');
    await GET(req, { params: Promise.resolve({ slug: [] }) });

    const init = mockFetch.mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('forwards query params to upstream', async () => {
    makeCookieStore();
    mockUpstream([]);

    const req = makeNextRequest('GET', '/api/proxy/products?search=widget&isActive=true');
    await GET(req, { params: Promise.resolve({ slug: [] }) });

    const upstreamUrl = mockFetch.mock.calls[0][0] as string;
    expect(upstreamUrl).toContain('search=widget');
    expect(upstreamUrl).toContain('isActive=true');
  });

  it('passes upstream status through (404)', async () => {
    makeCookieStore();
    mockUpstream({ message: 'not found' }, 404);

    const req = makeNextRequest('GET', '/api/proxy/products/missing');
    const res = await GET(req, { params: Promise.resolve({ slug: ['missing'] }) });

    expect(res.status).toBe(404);
  });
});

describe('products proxy — POST', () => {
  it('forwards request body', async () => {
    makeCookieStore('tok');
    mockUpstream({ id: 'new-prod' }, 201);

    const payload = { name: 'Widget', price: 9.99, stock: 5 };
    const req = makeNextRequest('POST', '/api/proxy/products', payload);
    const res = await POST(req, { params: Promise.resolve({ slug: [] }) });

    expect(res.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });
});

describe('products proxy — PATCH', () => {
  it('patches with body', async () => {
    makeCookieStore('tok');
    mockUpstream({ id: 'prod-1', price: 19.99 });

    const req = makeNextRequest('PATCH', '/api/proxy/products/prod-1', { price: 19.99 });
    await PATCH(req, { params: Promise.resolve({ slug: ['prod-1'] }) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/prod-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('products proxy — DELETE', () => {
  it('sends DELETE without body', async () => {
    makeCookieStore('tok');
    // Use 200 — NextResponse(body, { status: 204 }) is invalid per HTTP spec
    mockFetch.mockResolvedValueOnce({ status: 200, text: jest.fn().mockResolvedValue('') } as unknown as Response);

    const req = makeNextRequest('DELETE', '/api/proxy/products/prod-1');
    const res = await DELETE(req, { params: Promise.resolve({ slug: ['prod-1'] }) });

    expect(res.status).toBe(200);
    const init = mockFetch.mock.calls[0][1];
    expect(init.body).toBeUndefined();
  });
});
