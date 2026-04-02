'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus } from '@/lib/types';
import { getOrders, updateOrderStatus } from '@/lib/api/orders';
import OrderCard from './OrderCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';
import Link from 'next/link';

const STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const fetchOrders = useCallback(async (filter: OrderStatus | 'ALL') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOrders(
        filter !== 'ALL' ? { status: filter } : undefined,
      );
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter, fetchOrders]);

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      setUpdatingId(orderId);
      try {
        const updated = await updateOrderStatus(orderId, { status: newStatus });
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updated : o)),
        );
        setToast({ message: `Order status updated to ${newStatus}`, variant: 'success' });
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : 'Failed to update status',
          variant: 'error',
        });
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {STATUS_FILTER_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* New Order Button */}
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner label="Loading orders…" />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => fetchOrders(statusFilter)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">
            {statusFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase()} orders`
              : 'No orders yet'}
          </p>
          <Link
            href="/orders/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Place your first order
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' ? ` with status ${statusFilter}` : ''}
          </p>
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedId === order.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === order.id ? null : order.id))
                }
                onStatusChange={(status) => handleStatusChange(order.id, status)}
                isUpdating={updatingId === order.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
