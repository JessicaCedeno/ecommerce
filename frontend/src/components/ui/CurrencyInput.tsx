'use client';

import { type ChangeEvent } from 'react';
import { formatCOPCompact, parseRawNumber } from '@/lib/utils/currency';

interface CurrencyInputProps {
  id: string;
  /** Raw numeric string (no formatting) stored by the parent */
  value: string;
  /** Called with the raw numeric string on every change */
  onChange: (numericValue: string) => void;
  placeholder?: string;
  hasError?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Text input that displays a COP-formatted value with real-time thousands
 * separators (e.g. user types 1299990 → sees 1.299.990).
 * The parent always works with the raw numeric string for validation/submission.
 */
export default function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  hasError,
  ...ariaProps
}: CurrencyInputProps) {
  const displayValue = value ? formatCOPCompact(value) : '';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = parseRawNumber(e.target.value);
    onChange(raw);
  };

  return (
    <div className="relative mt-1">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`block w-full rounded-lg border py-2.5 pl-7 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
        }`}
        {...ariaProps}
      />
    </div>
  );
}
