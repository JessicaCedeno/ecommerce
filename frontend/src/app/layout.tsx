import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/nav/Navbar';
import { getSession } from '@/lib/auth/session';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LinkTic Shop',
  description: 'E-commerce microservices platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the session server-side so the Navbar can display the user's email.
  // getSession() is safe to call here — it simply reads cookies and returns null
  // when unauthenticated (login/register pages).
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-neutral-50 text-gray-900">
        {/* Sticky Navigation — receives email for user menu */}
        <Navbar userEmail={session?.email} />
        {/* Page content */}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

