import type { Metadata } from 'next';
import ProductsGrid from '@/components/products/ProductsGrid';

export const metadata: Metadata = {
  title: 'Products — LinkTic Shop',
  description: 'Browse and manage your product catalog',
};

export default function ProductsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your product catalog
        </p>
      </div>
      {/* ProductsGrid is a Client Component for interactive search + modal */}
      <ProductsGrid />
    </main>
  );
}
