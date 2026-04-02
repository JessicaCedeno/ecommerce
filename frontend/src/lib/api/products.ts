import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/lib/types';
import { unwrap } from '@/lib/api/http-client';

// On the server (SSR / Server Components) call the upstream API directly.
// In the browser, route through the Next.js proxy that injects the Bearer token
// from the httpOnly cookie (JS cannot read httpOnly cookies directly).
const BASE_URL =
  typeof window === 'undefined'
    ? (process.env.PRODUCTS_API_URL ?? 'http://localhost:4000/api/products')
    : (process.env.NEXT_PUBLIC_PRODUCTS_API_URL ?? '/api/proxy/products');

// ─── Products API ─────────────────────────────────────────────────────────────

/** List all products, optionally filtered by search term and/or active status */
export async function getProducts(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
  const query = qs.toString();
  const url = query ? `${BASE_URL}?${query}` : BASE_URL;

  const res = await fetch(url, { cache: 'no-store' });
  return unwrap<Product[]>(res);
}

/** Get a single product by UUID */
export async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`${BASE_URL}/${id}`, { cache: 'no-store' });
  return unwrap<Product>(res);
}

/** Create a new product */
export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return unwrap<Product>(res);
}

/** Partially update a product */
export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return unwrap<Product>(res);
}

/** Soft-delete a product (returns 204 No Content) */
export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
}
