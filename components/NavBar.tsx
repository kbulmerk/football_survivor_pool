'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';

interface Props {
  isAdmin: boolean;
}

const BASE_TABS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/league', label: 'Standings' },
  { href: '/pick', label: 'Pick' },
  { href: '/payment', label: 'Pay' },
];

export function NavBar({ isAdmin }: Props) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  const tabs = isAdmin ? [...BASE_TABS, { href: '/admin', label: 'Admin' }] : BASE_TABS;

  return (
    <>
      {/* Top Header */}
      <header style={{ background: '#221A10', borderBottom: '3px solid #A12821' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 13px' }}>
          <div>
            <div
              className="f-oswald"
              style={{ fontWeight: 700, letterSpacing: '1.5px', fontSize: '16px', lineHeight: 1, textTransform: 'uppercase', color: '#ECE0C4' }}
            >
              Bulmer Survivor Pool
            </div>
            <div
              className="f-mono"
              style={{ fontSize: '9px', letterSpacing: '2.5px', color: '#C68A2E', marginTop: '4px' }}
            >
              {isAdminPage ? 'ADMIN CONSOLE' : 'EST. 2026 · LAST TEAM STANDING'}
            </div>
          </div>
          <SignOutButton redirectUrl="/login">
            <button
              className="f-oswald"
              style={{ fontSize: '11px', letterSpacing: '1px', color: '#9c8a68', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>

      {/* Fixed Bottom Tab Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          background: '#221A10',
          borderTop: '3px solid #A12821',
          padding: '9px 6px 13px',
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: 'var(--font-oswald-var), sans-serif',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: isActive ? '#C68A2E' : '#8A7A5C',
                textDecoration: 'none',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
