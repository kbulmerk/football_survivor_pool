import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const clerkUser = await clerkCurrentUser();
  if (!clerkUser) redirect('/login');

  // Upsert user on every authenticated request so new Clerk users get a DB row
  const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? null;
  const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || null;

  await db
    .insert(users)
    .values({ id: userId, phone, name })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name,
        // Don't overwrite a manually-saved phone with null from Clerk free tier
        ...(phone !== null ? { phone } : {}),
      },
    });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    throw new Error('Forbidden: admin only');
  }
  return user;
}
