/**
 * Tests for src/lib/auth/actions.ts
 * Covers: loginAction, registerAction, logoutAction
 * Strategy: mock apiLogin/apiRegister, mock cookies(), mock redirect()
 */

// Mock the API functions
jest.mock('@/lib/api/auth', () => ({
  apiLogin: jest.fn(),
  apiRegister: jest.fn(),
}));

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiLogin, apiRegister } from '@/lib/api/auth';
import { loginAction, registerAction, logoutAction } from '@/lib/auth/actions';

const mockCookies = cookies as jest.Mock;
const mockRedirect = redirect as jest.Mock;
const mockApiLogin = apiLogin as jest.Mock;
const mockApiRegister = apiRegister as jest.Mock;

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(entries).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function makeCookieStore() {
  const store = { set: jest.fn(), delete: jest.fn(), get: jest.fn() };
  mockCookies.mockResolvedValue(store);
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  // redirect() throws internally in Next.js; mock it to be a no-op
  mockRedirect.mockImplementation(() => {});
});

describe('loginAction', () => {
  it('returns error when email is missing', async () => {
    const result = await loginAction({}, makeFormData({ email: '', password: 'pw' }));
    expect(result).toEqual({ error: 'Email and password are required.' });
    expect(mockApiLogin).not.toHaveBeenCalled();
  });

  it('returns error when password is missing', async () => {
    const result = await loginAction({}, makeFormData({ email: 'a@b.com', password: '' }));
    expect(result).toEqual({ error: 'Email and password are required.' });
  });

  it('sets cookies and redirects to /products on success', async () => {
    const store = makeCookieStore();
    mockApiLogin.mockResolvedValueOnce({ accessToken: 'tok-123' });

    await loginAction({}, makeFormData({ email: 'a@b.com', password: 'pw' }));

    expect(store.set).toHaveBeenCalledWith('token', 'tok-123', expect.objectContaining({ httpOnly: true }));
    expect(store.set).toHaveBeenCalledWith('user_email', 'a@b.com', expect.objectContaining({ httpOnly: false }));
    expect(mockRedirect).toHaveBeenCalledWith('/products');
  });

  it('returns error when apiLogin throws', async () => {
    makeCookieStore();
    mockApiLogin.mockRejectedValueOnce(new Error('Auth error 401: Invalid credentials'));

    const result = await loginAction({}, makeFormData({ email: 'a@b.com', password: 'bad' }));
    expect(result).toEqual({ error: 'Auth error 401: Invalid credentials' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns generic error when non-Error thrown', async () => {
    makeCookieStore();
    mockApiLogin.mockRejectedValueOnce('string error');

    const result = await loginAction({}, makeFormData({ email: 'a@b.com', password: 'pw' }));
    expect(result.error).toBe('Login failed. Please try again.');
  });

  it('cookie has 24h maxAge', async () => {
    const store = makeCookieStore();
    mockApiLogin.mockResolvedValueOnce({ accessToken: 'tok' });

    await loginAction({}, makeFormData({ email: 'a@b.com', password: 'pw' }));

    expect(store.set).toHaveBeenCalledWith(
      'token',
      expect.any(String),
      expect.objectContaining({ maxAge: 60 * 60 * 24 }),
    );
  });
});

describe('registerAction', () => {
  it('returns error when fields are empty', async () => {
    const result = await registerAction({}, makeFormData({ email: '', password: '' }));
    expect(result).toEqual({ error: 'Email and password are required.' });
  });

  it('registers, auto-logs in, sets cookies and redirects', async () => {
    const store = makeCookieStore();
    mockApiRegister.mockResolvedValueOnce({ id: 'uid', email: 'new@test.com' });
    mockApiLogin.mockResolvedValueOnce({ accessToken: 'new-tok' });

    await registerAction({}, makeFormData({ email: 'new@test.com', password: 'pass123' }));

    expect(mockApiRegister).toHaveBeenCalledWith({ email: 'new@test.com', password: 'pass123' });
    expect(mockApiLogin).toHaveBeenCalledWith({ email: 'new@test.com', password: 'pass123' });
    expect(store.set).toHaveBeenCalledWith('token', 'new-tok', expect.anything());
    expect(store.set).toHaveBeenCalledWith('user_email', 'new@test.com', expect.anything());
    expect(mockRedirect).toHaveBeenCalledWith('/products');
  });

  it('returns error when apiRegister throws', async () => {
    makeCookieStore();
    mockApiRegister.mockRejectedValueOnce(new Error('Email already taken'));

    const result = await registerAction(
      {},
      makeFormData({ email: 'dup@test.com', password: 'pw' }),
    );
    expect(result).toEqual({ error: 'Email already taken' });
  });

  it('returns error when apiLogin after registration fails', async () => {
    makeCookieStore();
    mockApiRegister.mockResolvedValueOnce({ id: '1', email: 'e@e.com' });
    mockApiLogin.mockRejectedValueOnce(new Error('Login after register failed'));

    const result = await registerAction(
      {},
      makeFormData({ email: 'e@e.com', password: 'pw' }),
    );
    expect(result.error).toBe('Login after register failed');
  });

  it('returns generic error for non-Error thrown', async () => {
    makeCookieStore();
    mockApiRegister.mockRejectedValueOnce(42);

    const result = await registerAction({}, makeFormData({ email: 'a@b.com', password: 'pw' }));
    expect(result.error).toBe('Registration failed. Please try again.');
  });
});

describe('logoutAction', () => {
  it('deletes both cookies and redirects to /login', async () => {
    const store = makeCookieStore();

    await logoutAction();

    expect(store.delete).toHaveBeenCalledWith('token');
    expect(store.delete).toHaveBeenCalledWith('user_email');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
