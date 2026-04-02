import type { Product } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { formatCOP } from '@/lib/utils/currency';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const hasStock = product.stock > 0;

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
          {product.name}
        </h3>
        <Badge variant={product.isActive ? 'green' : 'gray'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Description */}
      {product.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-3 flex-1">
          {product.description}
        </p>
      )}
      {!product.description && (
        <p className="mt-2 text-sm italic text-gray-300 flex-1">No description</p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">
          {formatCOP(product.price)}
        </span>
        <Badge variant={hasStock ? 'blue' : 'red'}>
          {hasStock ? `${product.stock} in stock` : 'Out of stock'}
        </Badge>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(product)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}
