/**
 * Shared HTTP response unwrapping utilities.
 * All API modules use these helpers to avoid duplicating error-handling logic.
 */
import type { ApiResponse } from '@/lib/types';

type NestErrorShape = {
  message?: string | string[] | { message?: string | string[] };
  error?: string;
};

/**
 * Extract a human-readable message from a NestJS error response body.
 * Handles the ValidationPipe nested structure: { message: { message: string[] } }
 */
function extractMessage(text: string): string {
  try {
    const json = JSON.parse(text) as NestErrorShape;
    const raw = json.message ?? json.error;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0] ?? text;
    if (raw && typeof raw === 'object') {
      const inner = (raw as { message?: string | string[] }).message;
      return Array.isArray(inner) ? (inner[0] ?? text) : (inner ?? text);
    }
  } catch {
    // Not JSON — use raw text as-is
  }
  return text;
}

/**
 * Unwrap a fetch Response that carries a NestJS `{ success, data, timestamp }` envelope.
 * Throws a clean Error on non-2xx responses.
 */
export async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    if (response.status >= 500) {
      throw new Error('Something went wrong. Please try again later.');
    }
    throw new Error(extractMessage(text));
  }
  const json: ApiResponse<T> = await response.json();
  return json.data;
}

/**
 * Unwrap a fetch Response for auth endpoints.
 * Gateway auth routes return data directly (no envelope); proxied routes use the envelope.
 * Handles both shapes via `json.data ?? json`.
 */
export async function unwrapAuth<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    if (response.status >= 500) {
      throw new Error('Something went wrong. Please try again later.');
    }
    throw new Error(extractMessage(text));
  }
  const json = await response.json();
  // Auth endpoints return { accessToken } directly; downstream proxy returns { success, data, ... }
  return ((json as { data?: T }).data ?? json) as T;
}
