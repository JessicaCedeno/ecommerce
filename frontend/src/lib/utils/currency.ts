const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const COP_COMPACT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as Colombian Pesos — e.g. $ 1.299.990 */
export function formatCOP(value: number | string): string {
  const num = Number(value);
  return isNaN(num) ? '$ 0' : COP.format(num);
}

/** Format a number with thousands separators only — e.g. 1.299.990 */
export function formatCOPCompact(value: number | string): string {
  const num = Number(value);
  return isNaN(num) ? '0' : COP_COMPACT.format(num);
}

/** Strip non-digit characters and return a plain numeric string */
export function parseRawNumber(formatted: string): string {
  return formatted.replace(/\D/g, '');
}
