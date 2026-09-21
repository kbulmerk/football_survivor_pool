import type { Pick } from '@/lib/schema';
import { getTeamColor, getTeamAbbr } from '@/lib/team-colors';

interface Member {
  userId: string;
  name: string | null;
  isAlive: boolean;
  isPaid: boolean;
  eliminatedWeek: number | null;
}

interface Props {
  members: Member[];
  allPicks: Pick[];
  currentWeek: number | null;
}

function TeamChip({ team, size = 11 }: { team: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '3px',
        background: getTeamColor(team),
        flexShrink: 0,
      }}
    />
  );
}

function resultBadge(pick: Pick | undefined): { label: string; color: string } {
  if (!pick) return { label: '–', color: '#bcae8f' };
  if (pick.result === 'eliminated') return { label: 'Eliminated', color: 'var(--varsity-red)' };
  if (pick.result === 'correct') return { label: 'Safe', color: 'var(--field-green)' };
  return { label: 'Pending', color: 'var(--amber-text)' };
}

export function StandingsTable({ members, allPicks, currentWeek }: Props) {
  // Members freshly eliminated this week stay grouped with the alive roster —
  // marked via the "Result" column — until currentWeek advances and they age
  // into the permanent "Out" group below.
  const alive = members.filter((m) => m.isAlive || m.eliminatedWeek === currentWeek);
  const eliminated = members.filter((m) => !m.isAlive && m.eliminatedWeek !== currentWeek);

  const currentPickByUser: Record<string, Pick> = {};
  if (currentWeek) {
    for (const p of allPicks.filter((p) => p.week === currentWeek)) {
      currentPickByUser[p.userId] = p;
    }
  }

  const headerCell = (label: string, flex: number, align: 'left' | 'center' | 'right' = 'left') => (
    <span
      className="f-oswald"
      style={{ flex, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', textAlign: align }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ border: '1.5px solid var(--ink)', borderRadius: '7px', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)' }}>
      {/* Header */}
      <div style={{ display: 'flex', background: 'var(--ink)', padding: '9px 14px' }}>
        {headerCell('Player', 2)}
        {headerCell('Paid', 0.7, 'center')}
        {headerCell('Status', 1.2)}
        {currentWeek && headerCell('Result', 1.2, 'center')}
        {currentWeek && headerCell('Pick', 1.3, 'right')}
      </div>

      {/* Alive rows (includes members eliminated this week, pending their move to "Out") */}
      {alive.map((m, i) => {
        const pick = currentPickByUser[m.userId];
        const badge = resultBadge(pick);
        return (
          <div
            key={m.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--paper-card)',
              padding: '12px 14px',
              borderBottom: i < alive.length - 1 || eliminated.length > 0 ? '1px solid var(--hairline)' : undefined,
            }}
          >
            <span className="f-spectral" style={{ flex: 2, fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
              {m.name ?? 'Unknown'}
            </span>
            <span style={{ flex: 0.7, textAlign: 'center', fontSize: '15px', color: m.isPaid ? 'var(--field-green)' : 'var(--amber-text)' }}>
              {m.isPaid ? '✓' : '–'}
            </span>
            <span style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--field-green)', flexShrink: 0 }} />
              <span className="f-oswald" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--field-green)' }}>Alive</span>
            </span>
            {currentWeek && (
              <span className="f-oswald" style={{ flex: 1.2, textAlign: 'center', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: badge.color }}>
                {badge.label}
              </span>
            )}
            {currentWeek && (
              <span style={{ flex: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                {pick ? (
                  <>
                    <TeamChip team={pick.teamPicked} size={11} />
                    <span className="f-oswald" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                      {getTeamAbbr(pick.teamPicked)}
                    </span>
                  </>
                ) : (
                  <span className="f-mono" style={{ fontSize: '13px', color: '#bcae8f' }}>—</span>
                )}
              </span>
            )}
          </div>
        );
      })}

      {/* Eliminated rows */}
      {eliminated.map((m, i) => (
        <div
          key={m.userId}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--paper-row-dead)',
            padding: '12px 14px',
            borderBottom: i < eliminated.length - 1 ? '1px solid var(--hairline)' : undefined,
          }}
        >
          <span className="f-spectral" style={{ flex: 2, fontWeight: 600, fontSize: '14px', color: '#9a8a6c', textDecoration: 'line-through' }}>
            {m.name ?? 'Unknown'}
          </span>
          <span style={{ flex: 0.7, textAlign: 'center', fontSize: '15px', color: m.isPaid ? 'var(--field-green)' : 'var(--amber-text)' }}>
            {m.isPaid ? '✓' : '–'}
          </span>
          <span style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--varsity-red)', flexShrink: 0 }} />
            <span className="f-oswald" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--varsity-red)' }}>
              Out{m.eliminatedWeek != null ? ` · W${m.eliminatedWeek}` : ''}
            </span>
          </span>
          {currentWeek && (
            <span className="f-mono" style={{ flex: 1.2, textAlign: 'center', fontSize: '13px', color: '#bcae8f' }}>—</span>
          )}
          {currentWeek && (
            <span className="f-mono" style={{ flex: 1.3, textAlign: 'right', fontSize: '13px', color: '#bcae8f' }}>—</span>
          )}
        </div>
      ))}
    </div>
  );
}
