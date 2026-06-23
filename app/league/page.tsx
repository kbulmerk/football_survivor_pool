import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getActiveLeague } from '@/app/actions/league';
import { leagueMembers, picks, users } from '@/lib/schema';
import { StandingsTable } from '@/components/StandingsTable';
import { PickHistory } from '@/components/PickHistory';

export default async function LeaguePage() {
  await getCurrentUser();
  const league = await getActiveLeague();
  if (!league) redirect('/dashboard');

  const members = await db
    .select({
      userId: leagueMembers.userId,
      isAlive: leagueMembers.isAlive,
      isPaid: leagueMembers.isPaid,
      eliminatedWeek: leagueMembers.eliminatedWeek,
      name: users.name,
      phone: users.phone,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, league.id))
    .orderBy(leagueMembers.isAlive, users.name);

  const allPicks = await db
    .select()
    .from(picks)
    .where(eq(picks.leagueId, league.id))
    .orderBy(picks.week, picks.userId);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{league.name} — Standings</h1>
      <StandingsTable members={members} />

      <h2 className="text-xl font-semibold mt-10 mb-4">Pick History</h2>
      <PickHistory picks={allPicks} members={members} />
    </main>
  );
}
