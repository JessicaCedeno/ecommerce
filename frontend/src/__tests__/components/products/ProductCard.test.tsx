/**
 * Tests for src/components/products/ProductCard.tsx
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';

const BASE_PRODUCT: Product = {
  id: 'prod-1',
  name: 'Wireless Headphones',
  description: 'Great sound quality',
  price: 49.99,
  stock: 10,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('ProductCard — basic rendering', () => {
  it('shows the product name', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('shows the price formatted in COP', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('$ 50')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.getByText('Great sound quality')).toBeInTheDocument();
  });

  it('shows "No description" in italics when description is null', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, description: null }} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});

describe('ProductCard — status badge', () => {
  it('shows "Active" badge for active products', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, isActive: true }} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('Active badge has green variant class', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, isActive: true }} />);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('bg-green-100');
  });

  it('shows "Inactive" badge for inactive products', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, isActive: false }} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('Inactive badge has gray variant class', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, isActive: false }} />);
    const badge = screen.getByText('Inactive');
    expect(badge.className).toContain('bg-gray-100');
  });
});

describe('ProductCard — stock badge', () => {
  it('shows stock count badge when stock > 0', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, stock: 5 }} />);
    expect(screen.getByText('5 in stock')).toBeInTheDocument();
  });

  it('stock badge has blue variant class', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, stock: 5 }} />);
    const badge = screen.getByText('5 in stock');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('shows "Out of stock" badge when stock === 0', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, stock: 0 }} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('"Out of stock" badge has red variant class', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, stock: 0 }} />);
    const badge = screen.getByText('Out of stock');
    expect(badge.className).toContain('bg-red-100');
  });
});

describe('ProductCard — price formatting', () => {
  it('formats whole number price in COP', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, price: 10 }} />);
    expect(screen.getByText('$ 10')).toBeInTheDocument();
  });

  it('formats large price with thousands separator', () => {
    render(<ProductCard product={{ ...BASE_PRODUCT, price: 1299990 }} />);
    expect(screen.getByText('$ 1.299.990')).toBeInTheDocument();
  });
});

describe('ProductCard — renders as article', () => {
  it('wraps content in an <article> element', () => {
    const { container } = render(<ProductCard product={BASE_PRODUCT} />);
    expect(container.querySelector('article')).toBeInTheDocument();
  });
});

describe('ProductCard — action buttons', () => {
  it('renders no action buttons when no callbacks are provided', () => {
    render(<ProductCard product={BASE_PRODUCT} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders Edit button when onEdit is provided', () => {
    render(<ProductCard product={BASE_PRODUCT} onEdit={jest.fn()} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('renders Delete button when onDelete is provided', () => {
    render(<ProductCard product={BASE_PRODUCT} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onEdit with the product when Edit is clicked', () => {
    const onEdit = jest.fn();
    render(<ProductCard product={BASE_PRODUCT} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(BASE_PRODUCT);
  });

  it('calls onDelete with the product when Delete is clicked', () => {
    const onDelete = jest.fn();
    render(<ProductCard product={BASE_PRODUCT} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(BASE_PRODUCT);
  });
});
