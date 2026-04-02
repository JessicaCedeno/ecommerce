/**
 * Tests for src/lib/auth/session.ts
 * Covers: getToken, getSession — with and without cookies
 *
 * Note: we import session functions once at module level and control cookie
 * behavior via a stable mockGet function.  We do NOT call jest.resetModules()
 * because that would cause the jest.mock factory in jest.setup.ts to create a
 * new jest.fn() — breaking the reference held by `mockCookies`.
 */

import { cookies } from 'next/headers';
import { getToken, getSession, TOKEN_COOKIE, USER_EMAIL_COOKIE } from '@/lib/auth/session';

const mockCookies = cookies as jest.Mock;

/** Helper: configure the cookies mock to return specific name→value pairs. */
function setupCookies(values: Record<string, string>) {
  mockCookies.mockResolvedValue({
    get: jest.fn((name: string) =>
      name in values ? { value: values[name] } : undefined,
    ),
    set: jest.fn(),
    delete: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('session — getToken', () => {
  it('returns token string when cookie is set', async () => {
    setupCookies({ token: 'my-jwt-token' });
    const token = await getToken();
    expect(token).toBe('my-jwt-token');
  });

  it('returns null when token cookie is absent', async () => {
    setupCookies({});
    const token = await getToken();
    expect(token).toBeNull();
  });
});

describe('session — getSession', () => {
  it('returns { email } when both cookies are set', async () => {
    setupCookies({ token: 'jwt', user_email: 'user@example.com' });
    const session = await getSession();
    expect(session).toEqual({ email: 'user@example.com' });
  });

  it('returns null when email cookie is missing', async () => {
    setupCookies({ token: 'jwt' });
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('returns null when token cookie is missing', async () => {
    setupCookies({ user_email: 'u@e.com' });
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('returns null when both cookies are absent', async () => {
    setupCookies({});
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe('session — exported constants', () => {
  it('TOKEN_COOKIE equals "token"', () => {
    expect(TOKEN_COOKIE).toBe('token');
  });

  it('USER_EMAIL_COOKIE equals "user_email"', () => {
    expect(USER_EMAIL_COOKIE).toBe('user_email');
  });
});
