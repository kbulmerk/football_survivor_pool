'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { picks } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
import { validatePick } from '@/lib/survivor-rules';

export async function submitPick(leagueId: string, week: number, team: string) {
  const user = await getCurrentUser();

  const error = await validatePick(user.id, leagueId, week, team);
  if (error) {
    const messages: Record<string, string> = {
      NOT_IN_LEAGUE: 'You are not a member of this league.',
      NOT_PAID: 'Your payment has not been confirmed yet.',
      WEEK_NOT_OPEN: 'Picks are not open for this week.',
      WEEK_LOCKED: 'The pick deadline has passed.',
      TEAM_ALREADY_USED: 'You already used that team in a previous week.',
      TEAM_IN_EXCLUDED_GAME: 'That game has been excluded by the admin.',
      TEAM_NOT_PLAYING: 'That team is not playing this week.',
    };
    return { error: messages[error] ?? 'Invalid pick.' };
  }

  await db
    .insert(picks)
    .values({ leagueId, userId: user.id, week, teamPicked: team })
    .onConflictDoUpdate({
      target: [picks.leagueId, picks.userId, picks.week],
      set: { teamPicked: team },
    });

  revalidatePath('/dashboard');
  revalidatePath('/pick');
  revalidatePath('/league');

  return { success: true };
}

export async function getMyPickForWeek(leagueId: string, week: number) {
  const user = await getCurrentUser();
  const [pick] = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.leagueId, leagueId),
        eq(picks.userId, user.id),
        eq(picks.week, week)
      )
    );
  return pick ?? null;
}
