'use client';

import { useState, type FormEvent } from 'react';
import { createProduct } from '@/lib/api/products';
import Modal from '@/components/ui/Modal';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  price?: string;
  stock?: string;
}

const INITIAL_FORM = { name: '', description: '', price: '', stock: '' };

export default function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0)
      newErrors.price = 'El precio debe ser mayor a 0';
    const stock = parseInt(form.stock, 10);
    if (form.stock === '' || isNaN(stock) || stock < 0)
      newErrors.stock = 'Stock must be 0 or more';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);
    try {
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
      });
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess();
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Failed to create product',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setApiError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Product">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="product-name"
            className="block text-sm font-medium text-gray-700"
          >
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="product-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Wireless Headphones"
            className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 ${
              errors.name
                ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
            }`}
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="product-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
            <span className="ml-1 text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            id="product-description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Brief description of the product…"
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* Price & Stock row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="product-price"
              className="block text-sm font-medium text-gray-700"
            >
              Precio (COP) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <CurrencyInput
              id="product-price"
              value={form.price}
              onChange={(raw) => setForm((f) => ({ ...f, price: raw }))}
              placeholder="0"
              hasError={!!errors.price}
              aria-describedby={errors.price ? 'price-error' : undefined}
              aria-invalid={!!errors.price}
            />
            {errors.price && (
              <p id="price-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.price}
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label
              htmlFor="product-stock"
              className="block text-sm font-medium text-gray-700"
            >
              Stock <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) =>
                setForm((f) => ({ ...f, stock: e.target.value }))
              }
              placeholder="0"
              className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                errors.stock
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              aria-describedby={errors.stock ? 'stock-error' : undefined}
              aria-invalid={!!errors.stock}
            />
            {errors.stock && (
              <p id="stock-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.stock}
              </p>
            )}
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating…
              </>
            ) : (
              'Create Product'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
