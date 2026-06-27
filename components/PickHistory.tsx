import type { Pick } from '@/lib/schema';
import { getTeamColor, getTeamAbbr } from '@/lib/team-colors';

interface Member {
  userId: string;
  name: string | null;
  isAlive: boolean;
  eliminatedWeek: number | null;
}

interface PickHistoryProps {
  picks: Pick[];
  members: Member[];
}

export function PickHistory({ picks, members }: PickHistoryProps) {
  const nameMap = Object.fromEntries(members.map((m) => [m.userId, m.name ?? 'Unknown']));
  const weeks = [...new Set(picks.map((p) => p.week))].sort((a, b) => a - b);

  if (picks.length === 0) {
    return (
      <p className="f-spectral" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
        No picks submitted yet.
      </p>
    );
  }

  return (
    <>
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '7px', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '520px' }}>
            {/* Header */}
            <div style={{ display: 'flex', background: 'var(--ink)' }}>
              <span
                className="f-oswald"
                style={{ width: '118px', flexShrink: 0, padding: '9px 14px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
              >
                Player
              </span>
              {weeks.map((w) => (
                <span
                  key={w}
                  className="f-oswald"
                  style={{ flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
                >
                  W{w}
                </span>
              ))}
            </div>

            {/* Member rows */}
            {members.map((member, rowIdx) => {
              const isEliminated = !member.isAlive;
              const rowBg = isEliminated ? 'var(--paper-row-dead)' : 'var(--paper-card)';
              const isLast = rowIdx === members.length - 1;

              return (
                <div
                  key={member.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: rowBg,
                    borderBottom: !isLast ? '1px solid var(--hairline)' : undefined,
                  }}
                >
                  {/* Player name */}
                  <span
                    className="f-spectral"
                    style={{
                      width: '118px',
                      flexShrink: 0,
                      padding: '11px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: isEliminated ? '#9a8a6c' : 'var(--ink)',
                      textDecoration: isEliminated ? 'line-through' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {nameMap[member.userId]}
                  </span>

                  {/* Week cells */}
                  {weeks.map((w) => {
                    const pick = picks.find((p) => p.userId === member.userId && p.week === w);
                    const isEliminatingPick = !member.isAlive && member.eliminatedWeek === w;
                    const isAfterElim = !member.isAlive && member.eliminatedWeek != null && w > member.eliminatedWeek;

                    if (!pick || isAfterElim) {
                      return (
                        <span
                          key={w}
                          className="f-mono"
                          style={{ flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: '13px', color: '#cbbd9a', alignSelf: 'center' }}
                        >
                          —
                        </span>
                      );
                    }

                    return (
                      <span
                        key={w}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '9px 4px' }}
                      >
                        <span
                          style={{
                            width: '13px',
                            height: '13px',
                            borderRadius: '3px',
                            background: getTeamColor(pick.teamPicked),
                            boxShadow: isEliminatingPick ? '0 0 0 2px #A12821' : undefined,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="f-mono"
                          style={{
                            fontSize: '9px',
                            color: isEliminatingPick ? 'var(--varsity-red)' : isEliminated ? '#9a8a6c' : 'var(--ink)',
                            textDecoration: isEliminatingPick ? 'line-through' : 'none',
                          }}
                        >
                          {getTeamAbbr(pick.teamPicked)}{isEliminatingPick ? ' ✗' : ''}
                        </span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div
        className="f-mono"
        style={{ textAlign: 'center', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--disabled-text)', padding: '8px 0 4px', textTransform: 'uppercase' }}
      >
        ← swipe table to see all weeks →
      </div>
    </>
  );
}
