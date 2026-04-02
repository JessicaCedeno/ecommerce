/**
 * Tests for src/lib/api/auth.ts
 * Covers: apiLogin, apiRegister — success + error paths, env var, envelope unwrap
 */

// Mock global fetch before importing the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { apiLogin, apiRegister } from '@/lib/api/auth';

// Helper: build a mock Response
function mockResponse(body: unknown, ok: boolean, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(
      typeof body === 'string' ? body : JSON.stringify(body),
    ),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('apiLogin', () => {
  it('returns accessToken on success', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        { success: true, data: { accessToken: 'jwt-abc' }, timestamp: '' },
        true,
      ),
    );

    const result = await apiLogin({ email: 'a@b.com', password: 'secret' });

    expect(result).toEqual({ accessToken: 'jwt-abc' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
      }),
    );
  });

  it('throws on non-ok response with JSON message', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: 'Invalid credentials' }, false, 401),
    );

    await expect(apiLogin({ email: 'x@y.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('throws on non-ok response with plain text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('Server exploded'),
      json: jest.fn().mockRejectedValue(new SyntaxError('not json')),
    } as unknown as Response);

    await expect(apiLogin({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Something went wrong',
    );
  });

  it('uses AUTH_API_URL env variable when set', async () => {
    const original = process.env.AUTH_API_URL;
    process.env.AUTH_API_URL = 'http://custom-auth:9000/api/auth';

    // Need to re-import after env change — use a dynamic import trick via jest.resetModules
    jest.resetModules();
    const { apiLogin: freshLogin } = await import('@/lib/api/auth');

    mockFetch.mockResolvedValueOnce(
      mockResponse({ success: true, data: { accessToken: 't' }, timestamp: '' }, true),
    );
    await freshLogin({ email: 'a@b.com', password: 'p' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom-auth:9000/api/auth/login',
      expect.anything(),
    );

    process.env.AUTH_API_URL = original;
  });
});

describe('apiRegister', () => {
  it('returns id and email on success', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        {
          success: true,
          data: { id: 'uuid-1', email: 'new@test.com' },
          timestamp: '',
        },
        true,
      ),
    );

    const result = await apiRegister({ email: 'new@test.com', password: 'pass' });

    expect(result).toEqual({ id: 'uuid-1', email: 'new@test.com' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/register'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when registration fails', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: 'Email already exists' }, false, 409),
    );

    await expect(
      apiRegister({ email: 'dup@test.com', password: 'pass' }),
    ).rejects.toThrow('Email already exists');
  });

  it('includes Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ success: true, data: { id: '1', email: 'e@e.com' }, timestamp: '' }, true),
    );

    await apiRegister({ email: 'e@e.com', password: 'p' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
