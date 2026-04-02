import { redirect } from 'next/navigation';

// Root redirects to the products page
export default function RootPage() {
  redirect('/products');
}

