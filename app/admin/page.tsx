import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getAllLeagues } from '@/app/actions/league';
import { games, leagueMembers, users, weekConfig } from '@/lib/schema';
import { AdminUserRow } from '@/components/AdminUserRow';
import { AdminGameRow } from '@/components/AdminGameRow';
import { AdminWeekControls } from '@/components/AdminWeekControls';
import { AdminLeagueSelector } from '@/components/AdminLeagueSelector';
import { AdminDeleteLeague } from '@/components/AdminDeleteLeague';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; league?: string }>;
}) {
  await requireAdmin().catch(() => redirect('/dashboard'));

  const allLeagues = await getAllLeagues();
  if (allLeagues.length === 0) {
    return (
      <main style={{ padding: '22px 20px 16px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '30px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginBottom: '16px' }}>
          Admin
        </h1>
        <p className="f-spectral" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No active league.</p>
        <Link
          href="/admin/create-league"
          className="f-oswald"
          style={{
            display: 'inline-block',
            background: 'var(--varsity-red)',
            color: '#FBF5E6',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            padding: '10px 18px',
            borderRadius: '4px',
            textDecoration: 'none',
            boxShadow: '3px 3px 0 rgba(34,26,16,0.18)',
          }}
        >
          Create League
        </Link>
      </main>
    );
  }

  const { week: weekParam, league: leagueParam } = await searchParams;
  const league =
    (leagueParam ? allLeagues.find((l) => l.id === leagueParam) : null) ?? allLeagues[0];

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
    .orderBy(users.name);

  const allConfigs = await db
    .select()
    .from(weekConfig)
    .where(eq(weekConfig.leagueId, league.id))
    .orderBy(weekConfig.week);

  const openConfig = allConfigs.find((c) => c.isOpen && !c.isLocked);
  const defaultWeek =
    openConfig?.week ?? (allConfigs.length > 0 ? Math.max(...allConfigs.map((c) => c.week)) : 1);
  const selectedWeek = weekParam ? Number(weekParam) : defaultWeek;
  const currentConfig = allConfigs.find((c) => c.week === selectedWeek) ?? null;

  const weekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, league.id), eq(games.week, selectedWeek)))
    .orderBy(games.startTime);

  return (
    <main style={{ padding: '22px 20px 16px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '30px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginBottom: '12px' }}>
        Admin
      </h1>

      {/* League selector */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 13px',
          background: 'var(--paper-card)',
          border: '1.5px solid var(--ink)',
          borderRadius: '5px',
          marginBottom: '9px',
        }}
      >
        <div>
          <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--mono-muted)' }}>LEAGUE</div>
          <div className="f-oswald" style={{ fontWeight: 600, fontSize: '15px', textTransform: 'uppercase', color: 'var(--ink)', marginTop: '1px' }}>
            {league.name} ({league.season})
          </div>
        </div>
        {allLeagues.length > 1 && (
          <>
            <span className="f-mono" style={{ fontSize: '18px', color: 'var(--ink)', pointerEvents: 'none' }}>▾</span>
            <AdminLeagueSelector leagues={allLeagues} selectedLeagueId={league.id} />
          </>
        )}
      </div>

      {/* New / Delete league buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '22px' }}>
        <Link
          href="/admin/create-league"
          className="f-oswald btn-outline"
          style={{ textDecoration: 'none' }}
        >
          New League
        </Link>
        <AdminDeleteLeague leagueId={league.id} leagueName={league.name} />
      </div>

      {/* Week Controls section */}
      <div style={{ marginBottom: '22px' }}>
        <span className="section-heading" style={{ marginBottom: '13px', display: 'inline-block' }}>Week Controls</span>
        <AdminWeekControls
          leagueId={league.id}
          currentConfig={currentConfig}
          allConfigs={allConfigs}
          selectedWeek={selectedWeek}
        />
      </div>

      {/* Games section */}
      <div style={{ marginBottom: '22px' }}>
        <span className="section-heading" style={{ marginBottom: '13px', display: 'inline-block' }}>
          Week {selectedWeek} Games
        </span>
        {weekGames.length === 0 ? (
          <p className="f-spectral" style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '13px' }}>
            No games loaded for this week.
          </p>
        ) : (
          <div style={{ border: '1.5px solid var(--ink)', borderRadius: '7px', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)', background: 'var(--paper-card)' }}>
            {weekGames.map((game, i) => (
              <div key={game.id} style={{ borderBottom: i < weekGames.length - 1 ? '1px solid var(--hairline)' : undefined }}>
                <AdminGameRow game={game} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Members section */}
      <div>
        <span className="section-heading" style={{ marginBottom: '13px', display: 'inline-block' }}>Members</span>
        <div style={{ border: '1.5px solid var(--ink)', borderRadius: '7px', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)', background: 'var(--paper-card)' }}>
          {members.map((member, i) => (
            <div key={member.userId} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--hairline)' : undefined }}>
              <AdminUserRow member={member} leagueId={league.id} currentWeek={selectedWeek} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
