import type { Metadata } from 'next';
import { Oswald, Spectral, Spline_Sans_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { NavBar } from '@/components/NavBar';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald-var',
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-spectral-var',
});

const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-spline-mono-var',
});

export const metadata: Metadata = {
  title: 'Survivor Pool',
  description: 'NFL Survivor Pool — pick one loser each week',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  let isAdmin = false;
  if (userId) {
    const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
    isAdmin = user?.isAdmin ?? false;
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${oswald.variable} ${spectral.variable} ${splineMono.variable} h-full antialiased`}
      >
        <body className={`min-h-full flex flex-col${userId ? ' pb-16' : ''}`}>
          {userId && <NavBar isAdmin={isAdmin} />}
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
