import type { Metadata } from 'next';
import OrdersList from '@/components/orders/OrdersList';

export const metadata: Metadata = {
  title: 'Orders — LinkTic Shop',
  description: 'View and manage all your orders',
};

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage all customer orders
        </p>
      </div>
      {/* OrdersList is a Client Component for accordion and status updates */}
      <OrdersList />
    </main>
  );
}
