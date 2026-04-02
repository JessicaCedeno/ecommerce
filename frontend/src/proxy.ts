import { NextRequest, NextResponse } from 'next/server';

/** Routes that don't require authentication. */
const PUBLIC_PATHS = ['/login', '/register'];

// Next.js 16 renamed "middleware" → "proxy" and the exported function must be
// named "proxy" (or be the default export).
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Pass through: public auth pages, Next.js internals, API routes, static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')  // favicon.ico, fonts, images, etc.
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the originally requested path so we can redirect back after login
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next.js static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
