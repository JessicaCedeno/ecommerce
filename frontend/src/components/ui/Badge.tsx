import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant: 'green' | 'red' | 'yellow' | 'gray' | 'blue';
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  green: 'bg-green-100 text-green-800 ring-green-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  gray: 'bg-gray-100 text-gray-600 ring-gray-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
};

export default function Badge({ children, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
