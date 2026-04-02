/**
 * Auth layout — no Navbar, full-screen centred gradient background.
 * Wraps /login and /register pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      {children}
    </div>
  );
}
