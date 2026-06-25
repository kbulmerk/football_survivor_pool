'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { leagueMembers, leagues, users } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export async function savePhoneAndJoin(
  leagueId: string,
  phone: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser();

  const normalized = normalizePhone(phone);
  if (!normalized) return { error: 'Enter a valid 10-digit US phone number.' };

  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) return { error: 'League not found.' };

  const [existing] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, user.id)));
  if (existing) return { error: 'You are already in this league.' };

  try {
    await db.update(users).set({ phone: normalized }).where(eq(users.id, user.id));
  } catch {
    return { error: 'That phone number is already associated with another account.' };
  }

  await db.insert(leagueMembers).values({ leagueId, userId: user.id });

  redirect('/league?joined=1');
}
