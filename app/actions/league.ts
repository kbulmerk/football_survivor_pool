'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagueMembers, leagues } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';

export async function joinLeague(leagueId: string) {
  const user = await getCurrentUser();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId));

  if (!league) return { error: 'League not found.' };

  const [existing] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, user.id))
    );

  if (existing) return { error: 'You are already in this league.' };

  await db.insert(leagueMembers).values({ leagueId, userId: user.id });

  revalidatePath('/dashboard');
  revalidatePath('/league');

  return { success: true };
}

export async function getActiveLeague() {
  // For MVP there is one active league — return the most recently created one
  const [league] = await db
    .select()
    .from(leagues)
    .orderBy(leagues.createdAt)
    .limit(1);
  return league ?? null;
}
