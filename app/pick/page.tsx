import { and, desc, eq, ne } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { games, leagueMembers, picks, weekConfig } from '@/lib/schema';
import { getAllLeagues, getLeagueById } from '@/app/actions/league';
import { autoAssignOnDeadlinePass } from '@/lib/survivor-rules';
import { PickForm } from '@/components/PickForm';
import { LeaguePicker } from '@/components/LeaguePicker';

export default async function PickPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>;
}) {
  const user = await getCurrentUser();
  const { leagueId } = await searchParams;

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
      return <LeaguePicker leagues={allLeagues} targetPath="/pick" title="Make Your Pick" />;
    }
  }

  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, league.id),
        eq(leagueMembers.userId, user.id)
      )
    );

  if (!member || !member.isPaid || !member.isAlive) redirect('/dashboard');

  const [config] = await db
    .select()
    .from(weekConfig)
    .where(
      and(
        eq(weekConfig.leagueId, league.id),
        eq(weekConfig.isOpen, true)
      )
    )
    .orderBy(desc(weekConfig.week))
    .limit(1);

  if (config && !config.isLocked && new Date() > config.deadline) {
    await autoAssignOnDeadlinePass(league.id, config.week);
  }

  const isLocked = config ? (config.isLocked || new Date() > config.deadline) : false;

  if (!config) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Make Your Pick</h1>
        <p className="text-gray-500">Picks are not open yet. Check back on Tuesday.</p>
      </main>
    );
  }

  const weekGames = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.leagueId, league.id),
        eq(games.week, config.week),
        eq(games.isExcluded, false)
      )
    )
    .orderBy(games.startTime);

  const priorPicks = await db
    .select({ team: picks.teamPicked })
    .from(picks)
    .where(
      and(
        eq(picks.leagueId, league.id),
        eq(picks.userId, user.id),
        ne(picks.week, config.week)
      )
    );

  const usedTeams = new Set(priorPicks.map((p) => p.team));

  const [currentPick] = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.leagueId, league.id),
        eq(picks.userId, user.id),
        eq(picks.week, config.week)
      )
    );

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Week {config.week} Pick</h1>
      <p className="text-gray-500 mb-6">
        Pick the team you think will <strong>lose</strong>. You cannot pick the same team twice.
      </p>

      <PickForm
        leagueId={league.id}
        week={config.week}
        games={weekGames}
        usedTeams={[...usedTeams]}
        currentPick={currentPick?.teamPicked ?? null}
        deadline={config.deadline.toISOString()}
        locked={isLocked}
      />

      <div className="mt-10 pt-6 border-t border-gray-200">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
