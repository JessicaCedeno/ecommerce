/**
 * Tests for src/app/api/auth/logout/route.ts
 * Covers: POST deletes cookies and returns { success: true }
 * @jest-environment node
 */

import { cookies } from 'next/headers';
import { POST } from '@/app/api/auth/logout/route';

const mockCookies = cookies as jest.Mock;

function makeCookieStore() {
  const store = { delete: jest.fn(), get: jest.fn(), set: jest.fn() };
  mockCookies.mockResolvedValue(store);
  return store;
}

describe('POST /api/auth/logout', () => {
  it('deletes token and user_email cookies', async () => {
    const store = makeCookieStore();

    await POST();

    expect(store.delete).toHaveBeenCalledWith('token');
    expect(store.delete).toHaveBeenCalledWith('user_email');
  });

  it('returns JSON { success: true }', async () => {
    makeCookieStore();

    const res = await POST();
    const body = await res.json();

    expect(body).toEqual({ success: true });
  });

  it('returns 200 status', async () => {
    makeCookieStore();

    const res = await POST();

    expect(res.status).toBe(200);
  });
});
