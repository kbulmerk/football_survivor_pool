import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getLeagueById } from '@/app/actions/league';
import { leagueMembers, quarterResults, squareAssignments, squaresConfig, users } from '@/lib/schema';
import { getTeamAbbr } from '@/lib/team-colors';
import { formatRound } from '@/lib/espn';
import { JoinLeagueButton } from '@/components/JoinLeagueButton';
import { SquaresGrid, type GridCell } from '@/components/squares/SquaresGrid';
import { ScorePoller } from '@/components/squares/ScorePoller';

export default async function SquaresPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>;
}) {
  const user = await getCurrentUser();
  const { leagueId } = await searchParams;
  if (!leagueId) redirect('/dashboard');

  const league = await getLeagueById(leagueId);
  if (!league || league.gameType !== 'squares') redirect('/dashboard');

  const [config] = await db
    .select()
    .from(squaresConfig)
    .where(eq(squaresConfig.leagueId, league.id));
  if (!config) redirect('/dashboard');

  const allMembers = await db
    .select({ userId: leagueMembers.userId, isPaid: leagueMembers.isPaid, name: users.name, phone: users.phone })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, league.id))
    .orderBy(users.name);

  const paidMembers = allMembers.filter((m) => m.isPaid);

  const nameOf = (userId: string | null) => {
    if (!userId) return '—';
    const m = allMembers.find((x) => x.userId === userId);
    return m?.name ?? m?.phone ?? 'Unknown';
  };

  const [membership] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)));

  const quarters = await db
    .select()
    .from(quarterResults)
    .where(eq(quarterResults.leagueId, league.id));
  const quarterMap = new Map(quarters.map((q) => [q.quarter, q]));

  const totalPot = paidMembers.length * Number(league.buyIn);
  const payouts = [config.payoutQ1, config.payoutQ2, config.payoutQ3, config.payoutQ4];

  let cells: GridCell[] = [];
  if (config.isLocked) {
    const rows = await db
      .select({
        row: squareAssignments.row,
        col: squareAssignments.col,
        userId: squareAssignments.userId,
        name: users.name,
        phone: users.phone,
      })
      .from(squareAssignments)
      .innerJoin(users, eq(squareAssignments.userId, users.id))
      .where(eq(squareAssignments.leagueId, league.id));
    cells = rows.map((r) => ({ row: r.row, col: r.col, userId: r.userId, name: r.name ?? r.phone ?? 'Unknown' }));
  }

  const rowDigits = config.rowDigits ? (JSON.parse(config.rowDigits) as number[]) : [];
  const colDigits = config.colDigits ? (JSON.parse(config.colDigits) as number[]) : [];

  const isMember = !!membership;
  const isPaid = membership?.isPaid ?? false;

  return (
    <main style={{ padding: '22px 20px 24px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '6px' }}>
        <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
          SQUARES · {formatRound(config.seasonType, config.week)} · {league.season}
        </div>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '32px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginTop: '3px' }}>
          {league.name}
        </h1>
        <div className="f-spectral" style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {getTeamAbbr(config.awayTeam)} @ {getTeamAbbr(config.homeTeam)} ·{' '}
          {config.startTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>

      {/* Pot summary */}
      <div className="f-mono" style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'var(--mono-muted)', margin: '6px 0 14px' }}>
        POT ${totalPot.toFixed(0)} · {paidMembers.length} {paidMembers.length === 1 ? 'PLAYER' : 'PLAYERS'} · ${Number(league.buyIn).toFixed(0)} BUY-IN
      </div>

      {/* Quarter winner banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {[1, 2, 3, 4].map((q) => {
          const result = quarterMap.get(q);
          const payout = (totalPot * payouts[q - 1]) / 100;
          return (
            <div
              key={q}
              className="ticket-card"
              style={{ padding: '10px 8px', textAlign: 'center', boxShadow: '3px 3px 0 rgba(34,26,16,0.13)' }}
            >
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1px', color: 'var(--gold)' }}>
                Q{q}
              </div>
              <div className="f-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                ${payout.toFixed(0)}
              </div>
              <div className="f-mono" style={{ fontSize: '9px', color: 'var(--mono-muted)' }}>
                {payouts[q - 1]}%
              </div>
              <div
                className="f-spectral"
                style={{ fontSize: '11px', color: result ? 'var(--field-green)' : 'var(--text-faint)', marginTop: '6px', lineHeight: 1.2, fontWeight: result ? 700 : 400 }}
              >
                {result ? nameOf(result.winnerUserId) : '—'}
              </div>
              {result && (
                <div className="f-mono" style={{ fontSize: '9px', color: 'var(--mono-muted)', marginTop: '1px' }}>
                  {result.homeScore}-{result.awayScore}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main content: pre-grid vs grid */}
      {config.isLocked ? (
        <>
          <SquaresGrid
            homeTeam={config.homeTeam}
            awayTeam={config.awayTeam}
            homeIsRows={config.homeIsRows ?? true}
            rowDigits={rowDigits}
            colDigits={colDigits}
            cells={cells}
            currentUserId={user.id}
          />
          <ScorePoller
            leagueId={league.id}
            startTime={config.startTime.toISOString()}
            allQuartersRecorded={quarters.length >= 4}
          />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* User status card */}
          {!isMember ? (
            <div className="ticket-card" style={{ padding: '16px' }}>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                {config.signupLocked ? 'Signups closed' : 'Join the pool'}
              </div>
              {config.signupLocked ? (
                <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                  Signups are closed. The grid will be generated soon.
                </p>
              ) : (
                <>
                  <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                    Squares are randomly assigned to all players once the admin locks signup. The numbers are revealed after that.
                  </p>
                  <div style={{ marginTop: '14px' }}>
                    <JoinLeagueButton leagueId={league.id} hasPhone={!!user.phone} />
                  </div>
                </>
              )}
            </div>
          ) : !isPaid ? (
            <div className="ticket-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                <div className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--amber-text)' }}>
                  Awaiting payment
                </div>
              </div>
              <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                You&apos;re signed up! Send ${Number(league.buyIn).toFixed(0)} to {league.venmoHandle} on Venmo to lock in your spot.
              </p>
              <div style={{ marginTop: '12px' }}>
                <Link href="/payment" className="btn-primary" style={{ textDecoration: 'none' }}>
                  Make Payment →
                </Link>
              </div>
            </div>
          ) : (
            <div className="ticket-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--field-green)', flexShrink: 0 }} />
                <div className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--field-green)' }}>
                  {config.signupLocked ? 'Locked in · Grid coming soon' : "You're in · Paid"}
                </div>
              </div>
              {!config.signupLocked && (
                <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.45 }}>
                  Squares will be randomly assigned once the admin locks signups.
                </p>
              )}
            </div>
          )}

          {/* Paid members roster */}
          <div className="ticket-card" style={{ padding: '16px' }}>
            <div className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '10px' }}>
              Signed Up · {paidMembers.length} paid
            </div>
            {paidMembers.length === 0 ? (
              <span className="f-spectral" style={{ fontSize: '13px', color: 'var(--text-faint)' }}>No paid players yet.</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {paidMembers.map((m) => (
                  <span
                    key={m.userId}
                    className="f-mono"
                    style={{ fontSize: '11px', padding: '4px 9px', background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: '20px', color: 'var(--ink)' }}
                  >
                    {m.name ?? m.phone ?? 'Unknown'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link href="/dashboard" className="btn-outline" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
