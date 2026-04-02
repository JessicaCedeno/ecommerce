/**
 * Tests for src/components/ui/Badge.tsx
 */

import { render, screen } from '@testing-library/react';
import Badge from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge variant="green">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a <span>', () => {
    const { container } = render(<Badge variant="blue">Info</Badge>);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('applies green variant classes', () => {
    render(<Badge variant="green">Green</Badge>);
    const el = screen.getByText('Green');
    expect(el.className).toContain('bg-green-100');
    expect(el.className).toContain('text-green-800');
  });

  it('applies red variant classes', () => {
    render(<Badge variant="red">Red</Badge>);
    const el = screen.getByText('Red');
    expect(el.className).toContain('bg-red-100');
    expect(el.className).toContain('text-red-800');
  });

  it('applies yellow variant classes', () => {
    render(<Badge variant="yellow">Yellow</Badge>);
    const el = screen.getByText('Yellow');
    expect(el.className).toContain('bg-yellow-100');
    expect(el.className).toContain('text-yellow-800');
  });

  it('applies gray variant classes', () => {
    render(<Badge variant="gray">Inactive</Badge>);
    const el = screen.getByText('Inactive');
    expect(el.className).toContain('bg-gray-100');
    expect(el.className).toContain('text-gray-600');
  });

  it('applies blue variant classes', () => {
    render(<Badge variant="blue">Blue</Badge>);
    const el = screen.getByText('Blue');
    expect(el.className).toContain('bg-blue-100');
    expect(el.className).toContain('text-blue-800');
  });

  it('renders numeric children', () => {
    render(<Badge variant="blue">{42}</Badge>);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
