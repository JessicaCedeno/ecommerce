/**
 * Tests for src/proxy.ts (Next.js 16 middleware renamed to proxy)
 * Covers: PUBLIC_PATHS passthrough, /_next, /api, dot-files, auth redirect, authenticated pass
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxy, config } from '@/proxy';

function makeRequest(pathname: string, token?: string): NextRequest {
  const url = `http://localhost${pathname}`;
  const req = new NextRequest(url);
  if (token) {
    req.cookies.set('token', token);
  }
  return req;
}

describe('proxy — public paths pass through', () => {
  it('allows /login', () => {
    const res = proxy(makeRequest('/login'));
    expect(res).toBeInstanceOf(NextResponse);
    // NextResponse.next() has status 200 and no redirect
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /register', () => {
    const res = proxy(makeRequest('/register'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows paths starting with /login (e.g. /login?from=/products)', () => {
    const res = proxy(makeRequest('/login?from=/products'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — Next.js internals pass through', () => {
  it('allows /_next/static path', () => {
    const res = proxy(makeRequest('/_next/static/chunk.js'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /_next/image', () => {
    const res = proxy(makeRequest('/_next/image?url=test.png'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — API routes pass through', () => {
  it('allows /api/proxy/products', () => {
    const res = proxy(makeRequest('/api/proxy/products'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /api/auth/logout', () => {
    const res = proxy(makeRequest('/api/auth/logout'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — static assets pass through', () => {
  it('allows paths with a dot (favicon.ico)', () => {
    const res = proxy(makeRequest('/favicon.ico'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows image files', () => {
    const res = proxy(makeRequest('/logo.png'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — unauthenticated redirect', () => {
  it('redirects to /login when no token cookie', () => {
    const res = proxy(makeRequest('/products'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
  });

  it('preserves "from" param with original pathname', () => {
    const res = proxy(makeRequest('/orders'));
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('from=%2Forders');
  });

  it('redirects /products/new to /login with from param', () => {
    const res = proxy(makeRequest('/products/new'));
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('from=');
  });
});

describe('proxy — authenticated pass through', () => {
  it('allows access when token cookie is present', () => {
    const res = proxy(makeRequest('/products', 'valid-jwt'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /orders with valid token', () => {
    const res = proxy(makeRequest('/orders', 'tok'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy — config matcher', () => {
  it('exports a config with matcher array', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
  });
});
