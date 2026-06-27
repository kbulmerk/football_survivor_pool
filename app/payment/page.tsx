import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMyLeagues, getLeagueById } from '@/app/actions/league';
import { leagueMembers } from '@/lib/schema';
import { LeagueSwitcherBar } from '@/components/LeagueSwitcherBar';

export default async function PaymentPage({
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
    league = myLeagues[0];
  }

  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)));

  const buyIn = Number(league.buyIn);
  const handle = league.venmoHandle.startsWith('@') ? league.venmoHandle : `@${league.venmoHandle}`;
  const handleRaw = league.venmoHandle.replace(/^@/, '');
  const venmoUrl = `https://venmo.com/${handleRaw}?txn=pay&amount=${buyIn}&note=${encodeURIComponent(`Survivor Pool ${league.season}`)}`;

  return (
    <main style={{ padding: '22px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
      <LeagueSwitcherBar league={league} leagues={myLeagues} targetPath="/payment" />

      {/* Page header */}
      <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
        {league.name.toUpperCase()} POOL
      </div>
      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '34px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginTop: '2px' }}>
        Pay Your Buy-In
      </h1>

      {/* Receipt ticket */}
      <div className="ticket-card" style={{ marginTop: '16px' }}>
        {/* Ticket stub header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', background: 'var(--ink)' }}>
          <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: '#ECE0C4' }}>BUY-IN RECEIPT</span>
          <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--gold)' }}>
            {member?.isPaid ? 'PAID' : 'UNPAID'}
          </span>
        </div>
        <div style={{ borderTop: '2px dashed var(--hairline-dash)' }} />

        <div style={{ padding: '18px 17px' }}>
          {member?.isPaid ? (
            /* Paid state */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 0', borderBottom: '1.5px solid var(--hairline)', marginBottom: '14px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--field-green)' }} />
                <span className="f-oswald" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--field-green)' }}>
                  Payment confirmed
                </span>
              </div>
              <p className="f-spectral" style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                You&apos;re all set! Your ${buyIn} buy-in has been confirmed. You&apos;re free to make picks.
              </p>
            </>
          ) : (
            /* Unpaid state */
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1.5px dashed var(--hairline-dash)' }}>
                <span className="f-oswald" style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Amount Due
                </span>
                <span className="f-oswald" style={{ fontWeight: 700, fontSize: '38px', color: 'var(--varsity-red)', lineHeight: 1 }}>
                  ${buyIn}
                </span>
              </div>
              <p className="f-spectral" style={{ fontSize: '14px', color: '#3a2e1c', lineHeight: 1.5, marginTop: '14px' }}>
                Send to{' '}
                <strong className="f-mono" style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>{handle}</strong>{' '}
                on Venmo with the note{' '}
                <em style={{ color: 'var(--varsity-red)' }}>Survivor Pool {league.season}</em>.
              </p>
              <a
                href={venmoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="f-oswald"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#FBF5E6',
                  background: 'var(--varsity-red)',
                  borderRadius: '5px',
                  padding: '14px',
                  marginTop: '15px',
                  textDecoration: 'none',
                  boxShadow: '4px 4px 0 rgba(34,26,16,0.18)',
                }}
              >
                Open Venmo →
              </a>
              <p className="f-spectral" style={{ fontStyle: 'italic', fontSize: '12.5px', color: 'var(--text-faint)', marginTop: '13px', lineHeight: 1.45 }}>
                After paying, the admin will confirm your payment and you&apos;ll be able to make picks.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
