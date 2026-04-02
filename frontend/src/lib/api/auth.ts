import { unwrapAuth } from '@/lib/api/http-client';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
}

interface RegisterResponse {
  id: string;
  email: string;
}

// This module is server-side only — never import from client components.
// Uses PRODUCTS_API_URL (no NEXT_PUBLIC_) to stay off the browser bundle.
const AUTH_URL = process.env.AUTH_API_URL ?? 'http://localhost:4000/api/auth';

/**
 * POST /api/auth/login  →  { accessToken }
 */
export async function apiLogin(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return unwrapAuth<AuthResponse>(res);
}

/**
 * POST /api/auth/register  →  { id, email }
 */
export async function apiRegister(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return unwrapAuth<RegisterResponse>(res);
}
