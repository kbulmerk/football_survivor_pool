import { and, eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMyLeagues, getLeagueById } from '@/app/actions/league';
import { leagueMembers, picks, users, weekConfig } from '@/lib/schema';
import { StandingsTable } from '@/components/StandingsTable';
import { PickHistory } from '@/components/PickHistory';
import { LeaguePicker } from '@/components/LeaguePicker';
import { LeagueSwitcherBar } from '@/components/LeagueSwitcherBar';

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; leagueId?: string }>;
}) {
  const user = await getCurrentUser();
  const { joined, leagueId } = await searchParams;

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
      return <LeaguePicker leagues={myLeagues} targetPath="/league" title="View Standings" memberships={membershipMap} />;
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
    .where(and(eq(weekConfig.leagueId, league.id), eq(weekConfig.isOpen, true), eq(weekConfig.isLocked, false)))
    .orderBy(weekConfig.week)
    .limit(1);

  const currentWeek = openWeekConfig?.week ?? null;
  const aliveCount = members.filter((m) => m.isAlive).length;
  const totalCount = members.length;

  return (
    <main style={{ padding: '16px 20px 16px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {joined === '1' && (
        <div
          className="f-spectral"
          style={{
            padding: '11px 14px',
            marginBottom: '16px',
            borderRadius: '4px',
            background: '#E0E8D6',
            color: 'var(--field-green)',
            fontSize: '13.5px',
            lineHeight: 1.4,
          }}
        >
          Successfully joined {league.name}!
        </div>
      )}

      <LeagueSwitcherBar league={league} leagues={myLeagues} targetPath="/league" />

      <div style={{ marginBottom: '13px' }}>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '30px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95 }}>
          Standings
        </h1>
        <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--mono-muted)', marginTop: '3px' }}>
          {currentWeek ? `WEEK ${currentWeek} · ` : ''}{aliveCount} ALIVE OF {totalCount}
        </div>
      </div>

      <StandingsTable members={members} allPicks={allPicks} currentWeek={currentWeek} />

      <div style={{ padding: '24px 0 0' }}>
        <span className="section-heading">Pick History</span>
      </div>
      <div style={{ marginTop: '13px' }}>
        <PickHistory picks={allPicks} members={members} />
      </div>
    </main>
  );
}
