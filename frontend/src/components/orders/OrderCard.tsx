import type { Order, OrderStatus } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { formatCOP } from '@/lib/utils/currency';

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: OrderStatus) => void;
  isUpdating: boolean;
}

const statusVariant: Record<OrderStatus, 'yellow' | 'green' | 'red'> = {
  PENDING: 'yellow',
  CONFIRMED: 'green',
  CANCELLED: 'red',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED'];

export default function OrderCard({
  order,
  isExpanded,
  onToggle,
  onStatusChange,
  isUpdating,
}: OrderCardProps) {
  const shortId = order.id.split('-')[0].toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Summary Row — always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        aria-expanded={isExpanded}
        aria-controls={`order-detail-${order.id}`}
      >
        {/* Expand icon */}
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          {/* Order ID */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Order</p>
            <p className="font-mono text-sm font-semibold text-gray-900">#{shortId}</p>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <div className="mt-0.5">
              <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
            </div>
          </div>

          {/* Total */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCOP(order.totalAmount)}
            </p>
          </div>

          {/* Date */}
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
            <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Item count badge */}
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Expanded Detail */}
      {isExpanded && (
        <div
          id={`order-detail-${order.id}`}
          className="border-t border-gray-100 px-5 py-5 space-y-5"
        >
          {/* Full ID */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Full Order ID
            </p>
            <p className="mt-0.5 font-mono text-xs text-gray-600 break-all">{order.id}</p>
          </div>

          {/* Items Table */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Items
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      Unit Price
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-gray-900">{item.productName}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatCOP(item.productPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {formatCOP(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">
                      {formatCOP(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Notes
              </p>
              <p className="mt-0.5 text-sm text-gray-700 rounded-lg bg-gray-50 px-3 py-2 border border-gray-100">
                {order.notes}
              </p>
            </div>
          )}

          {/* Status Selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor={`status-${order.id}`}
              className="text-sm font-medium text-gray-700"
            >
              Update Status:
            </label>
            <select
              id={`status-${order.id}`}
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
              disabled={isUpdating}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {isUpdating && (
              <span className="text-xs text-indigo-600 animate-pulse">
                Updating…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
