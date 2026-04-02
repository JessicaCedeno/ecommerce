'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiLogin, apiRegister } from '@/lib/api/auth';
import { TOKEN_COOKIE, USER_EMAIL_COOKIE } from '@/lib/auth/session';

/** Shape returned by every auth Server Action. */
export type AuthActionState = {
  error?: string;
  success?: boolean;
};

/** Shared cookie options for the JWT (httpOnly — JS cannot read it). */
function tokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 h
  };
}

/** Shared cookie options for the display email (NOT httpOnly — UI can read it). */
function emailCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24,
  };
}

/**
 * Server Action: authenticate user credentials.
 * On success sets cookies and redirects to /products.
 * On failure returns { error }.
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = (formData.get('email') as string | null) ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { accessToken } = await apiLogin({ email, password });
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, accessToken, tokenCookieOptions());
    cookieStore.set(USER_EMAIL_COOKIE, email, emailCookieOptions());
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Login failed. Please try again.',
    };
  }

  // redirect() throws internally — must be called outside try/catch
  redirect('/products');
}

/**
 * Server Action: register a new account then auto-login.
 * On success sets cookies and redirects to /products.
 * On failure returns { error }.
 */
export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = (formData.get('email') as string | null) ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    await apiRegister({ email, password });
    // Auto-login immediately after successful registration
    const { accessToken } = await apiLogin({ email, password });
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, accessToken, tokenCookieOptions());
    cookieStore.set(USER_EMAIL_COOKIE, email, emailCookieOptions());
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
    };
  }

  redirect('/products');
}

/**
 * Server Action: clear session cookies and redirect to /login.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(USER_EMAIL_COOKIE);
  redirect('/login');
}
