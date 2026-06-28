import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { leagueMembers, picks, weekConfig } from '@/lib/schema';
import { getAllLeagues } from '@/app/actions/league';
import { autoAssignOnDeadlinePass } from '@/lib/survivor-rules';
import { Countdown } from '@/components/Countdown';
import { JoinLeagueButton } from '@/components/JoinLeagueButton';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const user = await getCurrentUser();
  const allLeagues = await getAllLeagues();

  if (allLeagues.length === 0) {
    return (
      <main style={{ padding: '32px 20px', maxWidth: '560px', margin: '0 auto' }}>
        <p className="f-spectral" style={{ color: 'var(--text-muted)' }}>No active league. Check back soon.</p>
      </main>
    );
  }

  const leagueData = await Promise.all(
    allLeagues.map(async (league) => {
      const [member] = await db
        .select()
        .from(leagueMembers)
        .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)));

      const [config] = await db
        .select()
        .from(weekConfig)
        .where(and(eq(weekConfig.leagueId, league.id), eq(weekConfig.isOpen, true)))
        .orderBy(desc(weekConfig.week))
        .limit(1);

      if (config && !config.isLocked && new Date() > config.deadline) {
        await autoAssignOnDeadlinePass(league.id, config.week);
      }

      const currentWeek = config?.week ?? null;
      const isLocked = config ? (config.isLocked || new Date() > config.deadline) : false;

      const myPick = currentWeek
        ? await db
            .select()
            .from(picks)
            .where(and(eq(picks.leagueId, league.id), eq(picks.userId, user.id), eq(picks.week, currentWeek)))
            .then((rows) => rows[0] ?? null)
        : null;

      return { league, member: member ?? null, config: config ?? null, isLocked, myPick };
    })
  );

  return (
    <main style={{ padding: '22px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
      {msg === 'not-paid' && (
        <div style={{ marginBottom: '16px', background: 'var(--varsity-red)', border: '1.5px solid var(--ink)', borderRadius: '6px', boxShadow: '4px 4px 0 rgba(34,26,16,0.18)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 14px', background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
            <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2.5px', color: 'var(--cream-on-red)', textTransform: 'uppercase' }}>
              ACTION REQUIRED
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div className="f-oswald" style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px', color: '#FBF5E6', textTransform: 'uppercase' }}>
              Payment required to pick
            </div>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--cream-on-red)', marginTop: '4px', lineHeight: 1.4 }}>
              You can&apos;t select a team to lose until you&apos;ve been marked as paid. Make your payment and wait for admin confirmation.
            </p>
          </div>
        </div>
      )}
      {msg === 'join-league' && (
        <div style={{ marginBottom: '16px', background: 'var(--varsity-red)', border: '1.5px solid var(--ink)', borderRadius: '6px', boxShadow: '4px 4px 0 rgba(34,26,16,0.18)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 14px', background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
            <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2.5px', color: 'var(--cream-on-red)', textTransform: 'uppercase' }}>
              ACTION REQUIRED
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div className="f-oswald" style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px', color: '#FBF5E6', textTransform: 'uppercase' }}>
              You&apos;re not in a league yet
            </div>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--cream-on-red)', marginTop: '4px', lineHeight: 1.4 }}>
              Join a league below before you can view standings, make picks, or pay.
            </p>
          </div>
        </div>
      )}
      {/* Page header */}
      <div style={{ marginBottom: '4px' }}>
        <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
          {String(allLeagues.length).padStart(2, '0')} LEAGUES ON FILE
        </div>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '36px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.92, marginTop: '3px' }}>
          My Leagues
        </h1>
      </div>

      {/* League cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {leagueData.map(({ league, member, config, isLocked, myPick }, index) => {
          const serialNum = `${league.season}·${String(index + 1).padStart(2, '0')}`;
          const notJoined = !member;
          const paymentPending = member && !member.isPaid;
          const aliveAndPaid = member && member.isPaid && member.isAlive;
          const eliminated = member && !member.isAlive;

          return (
            <div
              key={league.id}
              className="ticket-card"
              style={{ marginTop: '16px' }}
            >
              {/* Ticket stub header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', background: 'var(--ink)' }}>
                <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: '#ECE0C4' }}>
                  NO. {serialNum}
                </span>
                <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--gold)' }}>
                  SEASON {league.season}
                </span>
              </div>
              {/* Perforation divider */}
              <div style={{ borderTop: '2px dashed var(--hairline-dash)' }} />

              {/* Card body */}
              <div style={{ padding: '17px 17px 16px' }}>
                <div className="f-oswald" style={{ fontWeight: 700, fontSize: '27px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 1 }}>
                  {league.name}
                </div>

                {/* STATE: Not joined */}
                {notJoined && (
                  <>
                    <div style={{ marginTop: '14px', padding: '13px 14px', background: 'var(--amber-bg)', border: '1.5px dashed var(--amber-border)', borderRadius: '5px' }}>
                      <div className="f-oswald" style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', color: 'var(--amber-text)', textTransform: 'uppercase' }}>
                        ▸ Not yet joined
                      </div>
                      <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.4 }}>
                        You haven&apos;t entered this pool. Join to lock your spot before kickoff.
                      </p>
                      <div style={{ marginTop: '11px' }}>
                        <JoinLeagueButton leagueId={league.id} hasPhone={!!user.phone} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '13px' }}>
                      <Link href={`/league?leagueId=${league.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
                        View Standings
                      </Link>
                      <Link href="/payment" className="btn-outline" style={{ textDecoration: 'none' }}>
                        Make Payment
                      </Link>
                    </div>
                  </>
                )}

                {/* STATE: Payment pending */}
                {paymentPending && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '13px', padding: '9px 0', borderTop: '1.5px solid var(--hairline)', borderBottom: '1.5px solid var(--hairline)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                      <span className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--amber-text)' }}>
                        Payment in progress
                      </span>
                    </div>
                    <p className="f-spectral" style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '11px', lineHeight: 1.45 }}>
                      Your ${Number(league.buyIn)} buy-in is awaiting admin confirmation. Picks unlock once you&apos;re marked paid.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '13px' }}>
                      <Link href="/payment" className="btn-primary" style={{ textDecoration: 'none' }}>
                        Make Payment →
                      </Link>
                      <Link href={`/league?leagueId=${league.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
                        View Standings
                      </Link>
                      <span className="btn-disabled">
                        Add Pick · locked until paid
                      </span>
                    </div>
                  </>
                )}

                {/* STATE: Eliminated */}
                {eliminated && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '13px', padding: '9px 0', borderTop: '1.5px solid var(--hairline)', borderBottom: '1.5px solid var(--hairline)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--varsity-red)', flexShrink: 0 }} />
                      <span className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--varsity-red)' }}>
                        Eliminated{member.eliminatedWeek != null ? ` · W${member.eliminatedWeek}` : ''}
                      </span>
                    </div>
                    <div style={{ marginTop: '13px' }}>
                      <Link href={`/league?leagueId=${league.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
                        View Standings
                      </Link>
                    </div>
                  </>
                )}

                {/* STATE: Alive & paid */}
                {aliveAndPaid && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '13px', padding: '9px 0', borderTop: '1.5px solid var(--hairline)', borderBottom: '1.5px solid var(--hairline)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--field-green)', flexShrink: 0 }} />
                      <span className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--field-green)' }}>
                        Alive
                      </span>
                      <span className="f-spectral" style={{ fontStyle: 'italic', fontSize: '12.5px', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                        Paid in full ✓
                      </span>
                    </div>

                    {/* Week panel */}
                    {config && (
                      <div style={{ marginTop: '13px', padding: '14px', background: 'var(--ink)', borderRadius: '6px', color: '#ECE0C4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span className="f-oswald" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                            Week {config.week}
                          </span>
                          <span className="f-mono" style={{ fontSize: '11px', color: '#9c8a68' }}>DEADLINE</span>
                        </div>
                        <Countdown
                          deadline={config.deadline.toISOString()}
                          variant="compact"
                          className="f-mono"
                          style={{ fontWeight: 700, fontSize: '30px', letterSpacing: '1px', display: 'block', marginTop: '4px' }}
                        />
                        {myPick ? (
                          <p className="f-spectral" style={{ fontStyle: 'italic', fontSize: '13px', color: '#bcae8f', marginTop: '2px' }}>
                            Pick: <strong style={{ fontStyle: 'normal' }}>{myPick.teamPicked}</strong> to lose
                          </p>
                        ) : (
                          <p className="f-spectral" style={{ fontStyle: 'italic', fontSize: '13px', color: '#bcae8f', marginTop: '2px' }}>
                            No pick made yet for this week.
                          </p>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '13px' }}>
                      {isLocked || !config ? (
                        <span className="btn-disabled">
                          {myPick ? 'Edit Pick · Deadline passed' : 'Add Pick · Deadline passed'}
                        </span>
                      ) : (
                        <Link href={`/pick?leagueId=${league.id}`} className="btn-primary" style={{ textDecoration: 'none' }}>
                          {myPick ? 'Edit Your Pick →' : 'Make Your Pick →'}
                        </Link>
                      )}
                      <Link href={`/league?leagueId=${league.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
                        View Standings
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
