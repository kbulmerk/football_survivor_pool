'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';

interface Props {
  isAdmin: boolean;
}

export function NavBar({ isAdmin }: Props) {
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`font-medium transition-colors ${
        pathname === href
          ? 'text-blue-600'
          : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 text-sm">
      <div className="flex items-center gap-5">
        {navLink('/dashboard', 'Dashboard')}
        {navLink('/league', 'Standings')}
        {navLink('/pick', 'Pick')}
        {navLink('/payment', 'Payment')}
        {isAdmin && navLink('/admin', 'Admin')}
      </div>
      <div className="flex items-center gap-5">
        <Link href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Bulmer Survivor Pool
        </Link>
        <SignOutButton redirectUrl="/login">
          <button className="text-gray-500 hover:text-gray-900">Sign out</button>
        </SignOutButton>
      </div>
    </nav>
  );
}
