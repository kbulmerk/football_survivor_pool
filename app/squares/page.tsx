import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getLeagueById } from '@/app/actions/league';
import { leagueMembers, quarterResults, squareAssignments, squaresConfig, users } from '@/lib/schema';
import { getTeamAbbr, getTeamColor2 } from '@/lib/team-colors';
import { formatRound, fetchESPNGameById, winningCell } from '@/lib/espn';
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

  // Fetch square assignments whenever signups are locked (two-step: squares then numbers)
  let cells: GridCell[] = [];
  let squaresAssigned = false;
  if (config.signupLocked) {
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
    squaresAssigned = cells.length > 0;
  }

  const rowDigits = config.rowDigits ? (JSON.parse(config.rowDigits) as number[]) : [];
  const colDigits = config.colDigits ? (JSON.parse(config.colDigits) as number[]) : [];

  // Fetch live ESPN score to compute current winning cell and show live scoreboard.
  // Only needed once numbers are revealed (isLocked) — before that we have no digits to match.
  // Default to 0-0 pre-game so the scoreboard is always visible after numbers are set.
  let liveHighlight: { row: number; col: number } | null = null;
  let liveGame: { homeScore: number; awayScore: number; period: number; completed: boolean } | null = null;
  if (config.isLocked && config.rowDigits && config.colDigits && config.homeIsRows !== null) {
    liveGame = { homeScore: 0, awayScore: 0, period: 0, completed: false };
    try {
      const game = await fetchESPNGameById(config.espnGameId, config.week, config.season, config.seasonType);
      if (game) {
        const homeScore = game.homeScore ?? 0;
        const awayScore = game.awayScore ?? 0;
        liveGame = { homeScore, awayScore, period: game.period, completed: game.completed };
      }
    } catch {
      // Non-critical — fallback stays at 0-0
    }
    liveHighlight = winningCell(liveGame.homeScore, liveGame.awayScore, rowDigits, colDigits, config.homeIsRows!);
  }

  const liveOwner = liveHighlight && cells.length > 0
    ? (cells.find((c) => c.row === liveHighlight!.row && c.col === liveHighlight!.col)?.name ?? '—')
    : '—';

  const isMember = !!membership;
  const isPaid = membership?.isPaid ?? false;
  const showGrid = config.signupLocked && squaresAssigned;

  const homeAbbr = getTeamAbbr(config.homeTeam);
  const awayAbbr = getTeamAbbr(config.awayTeam);

  return (
    <main style={{ padding: '22px 20px 24px', maxWidth: '980px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '6px' }}>
        <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
          SQUARES · {formatRound(config.seasonType, config.week)} · {league.season}
        </div>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '32px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginTop: '3px' }}>
          {league.name}
        </h1>
        <div className="f-spectral" style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {awayAbbr} @ {homeAbbr} ·{' '}
          {config.startTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>

      {/* Pot summary */}
      <div className="f-mono" style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'var(--mono-muted)', margin: '6px 0 14px' }}>
        POT ${totalPot.toFixed(0)} · {paidMembers.length} {paidMembers.length === 1 ? 'PLAYER' : 'PLAYERS'} · ${Number(league.buyIn).toFixed(0)} BUY-IN
      </div>

      {/* Quarter winner cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
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
                <div className="f-mono" style={{ fontSize: '9px', color: 'var(--mono-muted)', marginTop: '3px', lineHeight: 1.5 }}>
                  <span style={{ display: 'block' }}>{homeAbbr} {result.homeScore}</span>
                  <span style={{ display: 'block' }}>{awayAbbr} {result.awayScore}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live score box – Broadcast Board */}
      {liveGame && (
        <div style={{ background: '#201810', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 3px 0 rgba(36,28,17,0.25)', marginBottom: '16px' }}>
          {/* Top row: home | status | away */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>

            {/* Home team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '20px 14px' }}>
              <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '2px', color: '#c6a24a' }}>HOME</div>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '24px', letterSpacing: '1px', color: getTeamColor2(config.homeTeam), lineHeight: 1 }}>
                {homeAbbr}
              </div>
              <div className="f-spectral" style={{ fontSize: '10px', color: 'rgba(242,232,207,0.55)', marginBottom: '4px', textAlign: 'center' }}>
                {config.homeTeam}
              </div>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '60px', color: '#f2e8cf', lineHeight: 0.85 }}>
                {liveGame.homeScore}
              </div>
            </div>

            {/* Center status */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '0 18px', borderLeft: '1px solid rgba(242,232,207,0.12)', borderRight: '1px solid rgba(242,232,207,0.12)', alignSelf: 'stretch', justifyContent: 'center' }}>
              {liveGame.period === 0 ? (
                <>
                  <div className="f-mono" style={{ fontWeight: 700, fontSize: '9px', letterSpacing: '2px', color: '#201810', background: '#c6a24a', padding: '4px 10px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                    PRE-GAME
                  </div>
                  <div className="f-oswald" style={{ fontWeight: 600, fontSize: '18px', color: '#f2e8cf', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {config.startTime.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="f-mono" style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(242,232,207,0.5)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {config.startTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                  </div>
                </>
              ) : liveGame.completed ? (
                <div className="f-mono" style={{ fontWeight: 700, fontSize: '9px', letterSpacing: '2px', color: 'rgba(242,232,207,0.7)', background: 'rgba(242,232,207,0.15)', padding: '4px 10px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                  FINAL
                </div>
              ) : (
                <>
                  <div className="f-mono" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '9px', letterSpacing: '2px', color: '#f2e8cf', background: '#9e2a22', padding: '4px 10px', borderRadius: '3px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f2e8cf', display: 'inline-block', flexShrink: 0 }} />
                    LIVE
                  </div>
                  <div className="f-mono" style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(242,232,207,0.5)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {liveGame.period > 4 ? 'OVERTIME' : `Q${liveGame.period}`}
                  </div>
                </>
              )}
            </div>

            {/* Away team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '20px 14px' }}>
              <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '2px', color: 'rgba(242,232,207,0.45)' }}>AWAY</div>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '24px', letterSpacing: '1px', color: getTeamColor2(config.awayTeam), lineHeight: 1 }}>
                {awayAbbr}
              </div>
              <div className="f-spectral" style={{ fontSize: '10px', color: 'rgba(242,232,207,0.55)', marginBottom: '4px', textAlign: 'center' }}>
                {config.awayTeam}
              </div>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '60px', color: '#f2e8cf', lineHeight: 0.85 }}>
                {liveGame.awayScore}
              </div>
            </div>
          </div>

          {/* On the hook strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '11px 14px', background: '#181209', borderTop: '1px solid rgba(242,232,207,0.1)', flexWrap: 'wrap' }}>
            <span className="f-mono" style={{ fontSize: '9px', letterSpacing: '2px', color: '#c6a24a' }}>ON THE HOOK</span>
            {liveGame.period === 0 ? (
              <>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(242,232,207,0.3)', flexShrink: 0 }} />
                <span className="f-spectral" style={{ fontStyle: 'italic', fontSize: '13px', color: 'rgba(242,232,207,0.55)' }}>
                  Square is set at kickoff
                </span>
              </>
            ) : liveHighlight ? (
              <>
                <span className="f-spectral" style={{ fontWeight: 700, fontSize: '14px', color: '#f2e8cf' }}>{liveOwner}</span>
                <div style={{ display: 'flex', gap: '7px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center', border: '1.5px solid #c6a24a', borderRadius: '3px' }}>
                      <span className="f-oswald" style={{ fontWeight: 700, fontSize: '15px', color: '#f2e8cf' }}>
                        {config.homeIsRows ? rowDigits[liveHighlight.row] : colDigits[liveHighlight.col]}
                      </span>
                    </div>
                    <span className="f-mono" style={{ fontSize: '7px', letterSpacing: '1px', color: '#c6a24a' }}>{homeAbbr}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '30px', height: '30px', display: 'grid', placeItems: 'center', border: '1.5px solid #c6a24a', borderRadius: '3px' }}>
                      <span className="f-oswald" style={{ fontWeight: 700, fontSize: '15px', color: '#f2e8cf' }}>
                        {config.homeIsRows ? colDigits[liveHighlight.col] : rowDigits[liveHighlight.row]}
                      </span>
                    </div>
                    <span className="f-mono" style={{ fontSize: '7px', letterSpacing: '1px', color: '#c6a24a' }}>{awayAbbr}</span>
                  </div>
                </div>
              </>
            ) : (
              <span className="f-spectral" style={{ fontStyle: 'italic', fontSize: '13px', color: 'rgba(242,232,207,0.55)' }}>—</span>
            )}
          </div>
        </div>
      )}

      {/* Main content: pre-grid vs grid */}
      {showGrid ? (
        <>
          <SquaresGrid
            homeTeam={config.homeTeam}
            awayTeam={config.awayTeam}
            homeIsRows={config.homeIsRows ?? true}
            rowDigits={rowDigits}
            colDigits={colDigits}
            cells={cells}
            currentUserId={user.id}
            liveHighlightRow={liveHighlight?.row ?? null}
            liveHighlightCol={liveHighlight?.col ?? null}
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
