/**
 * Tests for src/components/nav/Navbar.tsx
 */

import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/nav/Navbar';

// Mock logoutAction to be a no-op server action
jest.mock('@/lib/auth/actions', () => ({
  logoutAction: jest.fn(),
}));

const mockUsePathname = usePathname as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe('Navbar — logo', () => {
  it('shows "LinkTic Shop" text', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    expect(screen.getByText('LinkTic Shop')).toBeInTheDocument();
  });

  it('logo links to /products', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    // The logo link wraps the text
    const logoLink = screen.getAllByRole('link').find((l) =>
      l.getAttribute('href') === '/products' && l.textContent?.includes('LinkTic Shop'),
    );
    expect(logoLink).toBeDefined();
  });
});

describe('Navbar — navigation links', () => {
  it('renders Products link', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    const link = screen.getByRole('link', { name: 'Products' });
    expect(link).toHaveAttribute('href', '/products');
  });

  it('renders Orders link', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    const link = screen.getByRole('link', { name: 'Orders' });
    expect(link).toHaveAttribute('href', '/orders');
  });

  it('marks /products link as aria-current="page" when active', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    const link = screen.getByRole('link', { name: 'Products' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark /orders as aria-current when on /products', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
    expect(ordersLink).not.toHaveAttribute('aria-current');
  });

  it('marks /orders link as aria-current="page" when on /orders', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(<Navbar />);
    const link = screen.getByRole('link', { name: 'Orders' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('marks /products active on sub-paths like /products/new', () => {
    mockUsePathname.mockReturnValue('/products/new');
    render(<Navbar />);
    const link = screen.getByRole('link', { name: 'Products' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});

describe('Navbar — unauthenticated (no userEmail)', () => {
  it('does not render avatar or sign-out when no email', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar />);
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });
});

describe('Navbar — authenticated (with userEmail)', () => {
  it('shows the user email', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar userEmail="alice@example.com" />);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows avatar with first letter of email (uppercased)', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar userEmail="alice@example.com" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows Sign out button', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar userEmail="alice@example.com" />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('Sign out is inside a form', () => {
    mockUsePathname.mockReturnValue('/products');
    render(<Navbar userEmail="alice@example.com" />);
    const btn = screen.getByRole('button', { name: 'Sign out' });
    expect(btn.closest('form')).toBeInTheDocument();
  });
});
