import Link from 'next/link';
import type { League } from '@/lib/schema';

interface LeagueMembership {
  isAlive: boolean;
  isPaid: boolean;
  joined: boolean;
}

interface Props {
  leagues: League[];
  targetPath: '/league' | '/pick';
  title: string;
  memberships?: Record<string, LeagueMembership>;
}

export function LeaguePicker({ leagues, targetPath, memberships }: Props) {
  const eyebrow = targetPath === '/pick' ? 'PICK' : 'STANDINGS';

  return (
    <main style={{ padding: '24px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
      <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
        {eyebrow}
      </div>
      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '32px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginTop: '2px' }}>
        Choose a League
      </h1>
      <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.45 }}>
        You&apos;re in {leagues.length} pool{leagues.length !== 1 ? 's' : ''}. Pick which one you&apos;d like to view.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
        {leagues.map((l) => {
          const m = memberships?.[l.id];
          const isAlive = m?.joined && m?.isPaid && m?.isAlive;
          const isPending = m?.joined && !m?.isPaid;
          const isElim = m?.joined && m?.isPaid && !m?.isAlive;
          const notJoined = !m?.joined;

          const dotColor = isAlive ? 'var(--field-green)'
            : isPending ? 'var(--amber)'
            : isElim ? 'var(--varsity-red)'
            : 'var(--amber)';

          const statusText = isAlive ? `Alive · Season ${l.season}`
            : isPending ? 'Payment in progress'
            : isElim ? 'Eliminated'
            : 'Not yet joined';

          const statusColor = isAlive ? 'var(--field-green)'
            : isPending ? 'var(--amber-text)'
            : isElim ? 'var(--varsity-red)'
            : 'var(--amber-text)';

          return (
            <Link
              key={l.id}
              href={`${targetPath}?leagueId=${l.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--paper-card)',
                  border: '1.5px solid var(--ink)',
                  borderRadius: '7px',
                  padding: '15px 16px',
                  boxShadow: '5px 5px 0 rgba(34,26,16,0.12)',
                }}
              >
                <div>
                  <div className="f-oswald" style={{ fontWeight: 700, fontSize: '19px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 1 }}>
                    {l.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span className="f-oswald" style={{ fontWeight: 600, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: statusColor }}>
                      {statusText}
                    </span>
                  </div>
                </div>
                <span className="f-oswald" style={{ fontWeight: 700, fontSize: '20px', color: 'var(--varsity-red)', flexShrink: 0 }}>→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
