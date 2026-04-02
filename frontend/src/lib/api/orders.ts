import type {
  Order,
  OrderStatus,
  CreateOrderPayload,
  UpdateOrderPayload,
} from '@/lib/types';
import { unwrap } from '@/lib/api/http-client';

// On the server (SSR / Server Components) call the upstream API directly.
// In the browser, route through the Next.js proxy that injects the Bearer token
// from the httpOnly cookie (JS cannot read httpOnly cookies directly).
const BASE_URL =
  typeof window === 'undefined'
    ? (process.env.ORDERS_API_URL ?? 'http://localhost:4000/api/orders')
    : (process.env.NEXT_PUBLIC_ORDERS_API_URL ?? '/api/proxy/orders');

// ─── Orders API ───────────────────────────────────────────────────────────────

/** List all orders, optionally filtered by status */
export async function getOrders(params?: {
  status?: OrderStatus;
}): Promise<Order[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  const url = query ? `${BASE_URL}?${query}` : BASE_URL;

  const res = await fetch(url, { cache: 'no-store' });
  return unwrap<Order[]>(res);
}

/** Get a single order by UUID */
export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${BASE_URL}/${id}`, { cache: 'no-store' });
  return unwrap<Order>(res);
}

/** Create a new order */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return unwrap<Order>(res);
}

/** Update the status of an order */
export async function updateOrderStatus(
  id: string,
  payload: UpdateOrderPayload,
): Promise<Order> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return unwrap<Order>(res);
}
