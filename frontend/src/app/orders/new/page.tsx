import type { Metadata } from 'next';
import Link from 'next/link';
import CreateOrderPage from './CreateOrderPage';

export const metadata: Metadata = {
  title: 'New Order — LinkTic Shop',
  description: 'Create a new order by selecting products',
};

export default function NewOrderPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link
              href="/orders"
              className="transition-colors hover:text-indigo-600 focus:outline-none focus:underline"
            >
              Orders
            </Link>
          </li>
          <li aria-hidden="true">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="font-medium text-gray-900" aria-current="page">
            New Order
          </li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select products and quantities to place your order
        </p>
      </div>

      {/* Client Component with all interactive logic */}
      <CreateOrderPage />
    </main>
  );
}
