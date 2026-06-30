import type { HallOfFameRow } from '@/lib/hall-of-fame';
import { getTeamColor, getTeamAbbr } from '@/lib/team-colors';

interface Props {
  rows: HallOfFameRow[];
  weeks: number;
}

export function HallOfFameBoard({ rows, weeks }: Props) {
  const weekNums = Array.from({ length: weeks }, (_, i) => i + 1);

  // Winners first, then by weeks survived (deepest run first).
  const sorted = [...rows].sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    return b.survived - a.survived;
  });

  if (rows.length === 0) {
    return (
      <p className="f-spectral" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
        No picks recorded for this season.
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
                style={{ width: '136px', flexShrink: 0, padding: '9px 14px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
              >
                Player
              </span>
              {weekNums.map((w) => (
                <span
                  key={w}
                  className="f-oswald"
                  style={{ flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
                >
                  W{w}
                </span>
              ))}
            </div>

            {/* Player rows */}
            {sorted.map((row, rowIdx) => {
              const rowBg = row.isWinner ? '#FBF3DD' : row.eliminatedWeek != null ? 'var(--paper-row-dead)' : 'var(--paper-card)';
              const isLast = rowIdx === sorted.length - 1;

              return (
                <div
                  key={`${row.name}-${rowIdx}`}
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
                      width: '136px',
                      flexShrink: 0,
                      padding: '11px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: row.isWinner ? 'var(--ink)' : row.eliminatedWeek != null ? '#9a8a6c' : 'var(--ink)',
                      textDecoration: !row.isWinner && row.eliminatedWeek != null ? 'line-through' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {row.isWinner && <span style={{ fontSize: '13px' }}>🏆</span>}
                    {row.name}
                  </span>

                  {/* Week cells */}
                  {weekNums.map((w) => {
                    const pick = row.picks[w - 1];
                    const isEliminatingPick = !row.isWinner && row.eliminatedWeek === w;

                    if (!pick) {
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
                            background: getTeamColor(pick),
                            boxShadow: isEliminatingPick ? '0 0 0 2px #A12821' : undefined,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="f-mono"
                          style={{
                            fontSize: '9px',
                            color: isEliminatingPick ? 'var(--varsity-red)' : row.eliminatedWeek != null && !row.isWinner ? '#9a8a6c' : 'var(--ink)',
                            textDecoration: isEliminatingPick ? 'line-through' : 'none',
                          }}
                        >
                          {getTeamAbbr(pick)}{isEliminatingPick ? ' ✗' : ''}
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
