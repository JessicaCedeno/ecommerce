'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';

const navLinks = [
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
];

interface NavbarProps {
  /** Email of the authenticated user, passed from the server layout. */
  userEmail?: string;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/products"
          className="flex items-center gap-2 text-xl font-bold text-indigo-600 transition-opacity hover:opacity-80"
        >
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <span>LinkTic Shop</span>
        </Link>

        {/* Right side: nav links + user menu */}
        <div className="flex items-center gap-2">
          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User menu — only rendered when authenticated */}
          {userEmail && (
            <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-3">
              {/* Avatar + truncated email */}
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
                  aria-hidden="true"
                >
                  {userEmail[0].toUpperCase()}
                </span>
                <span
                  className="hidden max-w-[140px] truncate text-sm text-gray-600 sm:block"
                  title={userEmail}
                >
                  {userEmail}
                </span>
              </div>

              {/* Logout — Server Action via form so it works without JS too */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
