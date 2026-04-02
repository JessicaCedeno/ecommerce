'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, CartItem } from '@/lib/types';
import { getProducts } from '@/lib/api/products';
import { createOrder } from '@/lib/api/orders';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';
import { formatCOP } from '@/lib/utils/currency';

export default function CreateOrderPage() {
  const router = useRouter();

  // Product search state
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchProducts = useCallback(async (q: string) => {
    setIsLoadingProducts(true);
    setProductError(null);
    try {
      const data = await getProducts(q ? { search: q } : undefined);
      setProducts(data);
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  const getCartQty = (productId: string) =>
    cart.find((c) => c.productId === productId)?.quantity ?? 0;

  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: 1,
          maxStock: product.stock,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId !== productId) return c;
          const next = c.quantity + delta;
          if (next <= 0) return null as unknown as CartItem;
          if (next > c.maxStock) return c;
          return { ...c, quantity: next };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const totalAmount = cart.reduce(
    (sum, c) => sum + c.productPrice * c.quantity,
    0,
  );

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setSubmitError('Add at least one item before placing the order.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createOrder({
        notes: notes.trim() || undefined,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });
      setToast('Order placed successfully! Redirecting to orders…');
      // Invalidate Next.js Server Component cache so /products shows updated stock
      router.refresh();
      setTimeout(() => router.push('/orders'), 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to place order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left Panel: Product Picker */}
      <section
        className="flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm"
        aria-label="Product selection"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Select Products</h2>
          <div className="relative mt-3">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <div className="max-h-[560px] divide-y divide-gray-50 overflow-y-auto p-2">
          {isLoadingProducts ? (
            <LoadingSpinner size="sm" label="Loading products…" />
          ) : productError ? (
            <p className="p-4 text-sm text-red-600">{productError}</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">
              {search ? `No results for "${search}"` : 'No products available'}
            </p>
          ) : (
            products.map((product) => {
              const qty = getCartQty(product.id);
              const outOfStock = product.stock === 0;
              const atMax = qty >= product.stock;

              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors ${
                    outOfStock ? 'opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm font-semibold text-indigo-600">
                        {formatCOP(product.price)}
                      </span>
                      <Badge variant={outOfStock ? 'red' : 'blue'}>
                        {outOfStock ? 'Out of stock' : `${product.stock} left`}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        {qty} in cart
                      </span>
                    )}
                    <button
                      onClick={() => addToCart(product)}
                      disabled={outOfStock || atMax}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      aria-label={`Add ${product.name} to order`}
                      title={
                        outOfStock
                          ? 'Out of stock'
                          : atMax
                          ? `Max stock reached (${product.stock})`
                          : `Add ${product.name}`
                      }
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Right Panel: Order Summary */}
      <section
        className="w-full lg:w-96 rounded-2xl border border-gray-200 bg-white shadow-sm"
        aria-label="Order summary"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 text-gray-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-400">
                No items added yet.
                <br />
                Use the product list to add items.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCOP(item.productPrice)} &times; {item.quantity} ={' '}
                      <strong>
                        {formatCOP(Number(item.productPrice) * item.quantity)}
                      </strong>
                    </p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCartQty(item.productId, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Decrease quantity of ${item.productName}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.productId, +1)}
                      disabled={item.quantity >= item.maxStock}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                      aria-label={`Increase quantity of ${item.productName}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                      aria-label={`Remove ${item.productName} from order`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              htmlFor="order-notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
              <span className="ml-1 text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions…"
              rows={3}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Total */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
              <span className="text-sm font-semibold text-indigo-900">Total Amount</span>
              <span className="text-xl font-bold text-indigo-700">
                {formatCOP(totalAmount)}
              </span>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {submitError}
            </div>
          )}

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Placing Order…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Place Order
              </>
            )}
          </button>
        </div>
      </section>

      {/* Success Toast */}
      {toast && (
        <Toast message={toast} variant="success" onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
