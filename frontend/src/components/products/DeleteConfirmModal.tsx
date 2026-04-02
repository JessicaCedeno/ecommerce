'use client';

import { useState } from 'react';
import { deleteProduct } from '@/lib/api/products';
import type { Product } from '@/lib/types';
import Modal from '@/components/ui/Modal';

interface DeleteConfirmModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export default function DeleteConfirmModal({
  product,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!product) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      await deleteProduct(product.id);
      onSuccess(product.id);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to delete product');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  return (
    <Modal isOpen={product !== null} onClose={handleClose} title="Delete Product">
      <div className="space-y-4">
        {/* Warning icon + message */}
        <div className="flex gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{product?.name}</span>?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This will deactivate the product. It will no longer appear in listings or be available for new orders.
            </p>
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
