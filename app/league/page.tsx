import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getAllLeagues, getLeagueById } from '@/app/actions/league';
import { leagueMembers, picks, users, weekConfig } from '@/lib/schema';
import { StandingsTable } from '@/components/StandingsTable';
import { PickHistory } from '@/components/PickHistory';
import { LeaguePicker } from '@/components/LeaguePicker';

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; leagueId?: string }>;
}) {
  await getCurrentUser();
  const { joined, leagueId } = await searchParams;

  let league;
  if (leagueId) {
    league = await getLeagueById(leagueId);
    if (!league) redirect('/dashboard');
  } else {
    const allLeagues = await getAllLeagues();
    if (allLeagues.length === 0) redirect('/dashboard');
    if (allLeagues.length === 1) {
      league = allLeagues[0];
    } else {
      return <LeaguePicker leagues={allLeagues} targetPath="/league" title="View Standings" />;
    }
  }

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

  const [openWeekConfig] = await db
    .select()
    .from(weekConfig)
    .where(
      and(
        eq(weekConfig.leagueId, league.id),
        eq(weekConfig.isOpen, true),
        eq(weekConfig.isLocked, false)
      )
    )
    .orderBy(weekConfig.week)
    .limit(1);

  const currentWeek = openWeekConfig?.week ?? null;

  return (
    <main className="p-8 max-w-[60%] mx-auto">
      {joined === '1' && (
        <div className="rounded-lg p-4 mb-6 bg-green-100 text-green-800 font-semibold">
          Successfully joined {league.name}!
        </div>
      )}
      <h1 className="text-2xl font-bold mb-6">{league.name} — Standings</h1>
      <StandingsTable members={members} allPicks={allPicks} currentWeek={currentWeek} />

      <h2 className="text-xl font-semibold mt-10 mb-4">Pick History</h2>
      <PickHistory picks={allPicks} members={members} />

      <div className="mt-10 pt-6 border-t border-gray-200">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
