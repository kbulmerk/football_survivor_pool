import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { games, leagueMembers, picks, weekConfig } from '@/lib/schema';
import { getMyLeagues, getLeagueById } from '@/app/actions/league';
import { autoAssignOnDeadlinePass } from '@/lib/survivor-rules';
import { PickForm } from '@/components/PickForm';
import { LeaguePicker } from '@/components/LeaguePicker';
import { LeagueSwitcherBar } from '@/components/LeagueSwitcherBar';

export default async function PickPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>;
}) {
  const user = await getCurrentUser();
  const { leagueId } = await searchParams;

  const myLeagues = await getMyLeagues();
  if (myLeagues.length === 0) redirect('/dashboard?msg=join-league');

  let league;
  if (leagueId) {
    league = await getLeagueById(leagueId);
    if (!league) redirect('/dashboard');
  } else {
    if (myLeagues.length === 1) {
      league = myLeagues[0];
    } else {
      const allMemberships = await db
        .select({ leagueId: leagueMembers.leagueId, isAlive: leagueMembers.isAlive, isPaid: leagueMembers.isPaid })
        .from(leagueMembers)
        .where(and(eq(leagueMembers.userId, user.id), inArray(leagueMembers.leagueId, myLeagues.map((l) => l.id))));
      const membershipMap = Object.fromEntries(
        allMemberships.map((m) => [m.leagueId, { isAlive: m.isAlive, isPaid: m.isPaid, joined: true }])
      );
      return <LeaguePicker leagues={myLeagues} targetPath="/pick" title="Make Your Pick" memberships={membershipMap} />;
    }
  }

  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)));

  if (!member || !member.isPaid || !member.isAlive) redirect('/dashboard');

  const [config] = await db
    .select()
    .from(weekConfig)
    .where(and(eq(weekConfig.leagueId, league.id), eq(weekConfig.isOpen, true)))
    .orderBy(desc(weekConfig.week))
    .limit(1);

  if (config && !config.isLocked && new Date() > config.deadline) {
    await autoAssignOnDeadlinePass(league.id, config.week);
  }

  const isLocked = config ? (config.isLocked || new Date() > config.deadline) : false;

  if (!config) {
    return (
      <main style={{ padding: '22px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
        <LeagueSwitcherBar league={league} leagues={myLeagues} targetPath="/pick" />
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '34px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95 }}>
          Make Your Pick
        </h1>
        <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.45 }}>
          Picks are not open yet. Check back soon.
        </p>
      </main>
    );
  }

  const weekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, league.id), eq(games.week, config.week), eq(games.isExcluded, false)))
    .orderBy(games.startTime);

  const priorPicks = await db
    .select({ team: picks.teamPicked })
    .from(picks)
    .where(and(eq(picks.leagueId, league.id), eq(picks.userId, user.id), ne(picks.week, config.week)));

  const usedTeams = new Set(priorPicks.map((p) => p.team));

  const [currentPick] = await db
    .select()
    .from(picks)
    .where(and(eq(picks.leagueId, league.id), eq(picks.userId, user.id), eq(picks.week, config.week)));

  return (
    <main style={{ padding: '16px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
      <LeagueSwitcherBar league={league} leagues={myLeagues} targetPath="/pick" />

      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '34px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95 }}>
        Week {config.week} Pick
      </h1>
      <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.45 }}>
        Pick the team you think will{' '}
        <strong style={{ color: 'var(--varsity-red)' }}>lose</strong>. You cannot pick the same team twice.
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
    </main>
  );
}
