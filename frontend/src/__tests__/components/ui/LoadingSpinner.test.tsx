/**
 * Tests for src/components/ui/LoadingSpinner.tsx
 */

import { render, screen } from '@testing-library/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('has role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has default aria-label "Loading…"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading…');
  });

  it('shows the default label text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<LoadingSpinner label="Fetching data…" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data…');
    expect(screen.getByText('Fetching data…')).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-4');
    expect(spinner?.className).toContain('w-4');
  });

  it('applies md size classes by default', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-8');
    expect(spinner?.className).toContain('w-8');
  });

  it('applies lg size classes', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-12');
    expect(spinner?.className).toContain('w-12');
  });
});
