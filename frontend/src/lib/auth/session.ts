import { cookies } from 'next/headers';

export const TOKEN_COOKIE = 'token';
export const USER_EMAIL_COOKIE = 'user_email';

/**
 * Returns the raw JWT string from the httpOnly cookie (server-side only).
 */
export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

/**
 * Returns the active session object (email) if both cookies are present,
 * or null when the user is not authenticated.
 * Readable by server components and route handlers.
 */
export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const email = cookieStore.get(USER_EMAIL_COOKIE)?.value;
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!email || !token) return null;
  return { email };
}
