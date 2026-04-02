import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const UPSTREAM =
  process.env.PRODUCTS_API_URL ?? 'http://localhost:4000/api/products';

/** Build the upstream URL preserving path segments and query parameters. */
function buildUpstreamUrl(slug: string[], searchParams: URLSearchParams): string {
  const path = slug.length ? '/' + slug.join('/') : '';
  const url = new URL(UPSTREAM + path);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}

async function proxyRequest(
  request: NextRequest,
  slug: string[],
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const upstreamUrl = buildUpstreamUrl(slug, request.nextUrl.searchParams);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  // Attach body for mutating methods
  if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
    init.body = await request.text();
  }

  const upstream = await fetch(upstreamUrl, init);

  // 204 / 304 have no body — returning one causes a Next.js runtime error
  if (upstream.status === 204 || upstream.status === 304) {
    return new NextResponse(null, { status: upstream.status });
  }

  const body = await upstream.text();

  // Pass the upstream status code through unchanged so the client can handle 401/404/etc.
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type RouteContext = { params: Promise<{ slug?: string[] }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug = [] } = await params;
  return proxyRequest(request, slug);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { slug = [] } = await params;
  return proxyRequest(request, slug);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { slug = [] } = await params;
  return proxyRequest(request, slug);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { slug = [] } = await params;
  return proxyRequest(request, slug);
}
