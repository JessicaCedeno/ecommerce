import '@testing-library/jest-dom';

// ─── next/navigation global mock ─────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/products'),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  redirect: jest.fn(),
}));

// ─── next/headers global mock ────────────────────────────────────────────────
jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    }),
  ),
}));

// ─── next/cache global mock ──────────────────────────────────────────────────
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
