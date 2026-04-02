import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign In — LinkTic Shop' };

/**
 * Server Component: check for an existing session before rendering the form.
 * If the user is already authenticated they are redirected to /products.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/products');

  return <LoginForm />;
}
