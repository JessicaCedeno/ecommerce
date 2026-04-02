import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = { title: 'Create Account — LinkTic Shop' };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/products');

  return <RegisterForm />;
}
