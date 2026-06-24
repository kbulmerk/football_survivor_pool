import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { NavBar } from '@/components/NavBar';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

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
      <html lang="en" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
          {userId && <NavBar isAdmin={isAdmin} />}
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
