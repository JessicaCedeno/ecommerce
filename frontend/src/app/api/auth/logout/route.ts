import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/logout
 * Clears the session cookies. Can be called from client-side fetch as a
 * fallback — the Navbar uses the logoutAction Server Action instead.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('user_email');
  return NextResponse.json({ success: true });
}
