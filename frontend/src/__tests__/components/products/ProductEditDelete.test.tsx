/**
 * Tests for EditProductModal and DeleteConfirmModal
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditProductModal from '@/components/products/EditProductModal';
import DeleteConfirmModal from '@/components/products/DeleteConfirmModal';
import type { Product } from '@/lib/types';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/lib/api/products', () => ({
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

import { updateProduct, deleteProduct } from '@/lib/api/products';
const mockUpdate = updateProduct as jest.MockedFunction<typeof updateProduct>;
const mockDelete = deleteProduct as jest.MockedFunction<typeof deleteProduct>;

// Modal uses createPortal — render into document.body
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

const BASE_PRODUCT: Product = {
  id: 'prod-1',
  name: 'Wireless Headphones',
  description: 'Great sound',
  price: 199990,
  stock: 5,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── EditProductModal ────────────────────────────────────────────────────────
describe('EditProductModal', () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('does not render when product is null', () => {
    render(<EditProductModal product={null} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with product data pre-filled', () => {
    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByDisplayValue('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Great sound')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('shows title "Edit Product"', () => {
    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText('Edit Product')).toBeInTheDocument();
  });

  it('shows validation error when name is cleared', async () => {
    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument());
  });

  it('calls updateProduct and onSuccess on valid submit', async () => {
    const updated = { ...BASE_PRODUCT, name: 'Updated Name' };
    mockUpdate.mockResolvedValue(updated);

    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('prod-1', expect.objectContaining({ name: 'Updated Name' })));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(updated));
  });

  it('shows API error message on failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Product not found'));

    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText('Product not found')).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets form when a new product is passed', () => {
    const { rerender } = render(
      <EditProductModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />,
    );
    const other: Product = { ...BASE_PRODUCT, id: 'prod-2', name: 'Keyboard', price: 89990 };
    rerender(<EditProductModal product={other} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByDisplayValue('Keyboard')).toBeInTheDocument();
  });
});

// ── DeleteConfirmModal ──────────────────────────────────────────────────────
describe('DeleteConfirmModal', () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('does not render when product is null', () => {
    render(<DeleteConfirmModal product={null} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows product name in confirmation message', () => {
    render(<DeleteConfirmModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('calls deleteProduct and onSuccess on confirm', async () => {
    mockDelete.mockResolvedValue(undefined);

    render(<DeleteConfirmModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('prod-1'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('prod-1'));
  });

  it('shows API error and does not call onSuccess on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Delete failed'));

    render(<DeleteConfirmModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.getByText('Delete failed')).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<DeleteConfirmModal product={BASE_PRODUCT} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
