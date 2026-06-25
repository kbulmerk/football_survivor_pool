'use server';

import { and, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
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

  redirect(`/league?joined=1&leagueId=${leagueId}`);
}

export async function getActiveLeague() {
  const [league] = await db
    .select()
    .from(leagues)
    .orderBy(desc(leagues.createdAt))
    .limit(1);
  return league ?? null;
}

export async function getLeagueById(id: string) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
  return league ?? null;
}

export async function getAllLeagues() {
  return db.select().from(leagues).orderBy(desc(leagues.createdAt));
}
