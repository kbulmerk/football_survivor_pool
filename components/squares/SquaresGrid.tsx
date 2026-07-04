import { getTeamColor, getTeamColor2 } from '@/lib/team-colors';

export type GridCell = { row: number; col: number; userId: string; name: string };

function shortLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}` : parts[0];
}

export function SquaresGrid({
  homeTeam,
  awayTeam,
  homeIsRows,
  rowDigits,
  colDigits,
  cells,
  currentUserId,
  liveHighlightRow,
  liveHighlightCol,
}: {
  homeTeam: string;
  awayTeam: string;
  homeIsRows: boolean;
  rowDigits: number[];
  colDigits: number[];
  cells: GridCell[];
  currentUserId: string;
  liveHighlightRow?: number | null;
  liveHighlightCol?: number | null;
}) {
  const rowTeam = homeIsRows ? homeTeam : awayTeam;
  const colTeam = homeIsRows ? awayTeam : homeTeam;
  // Row team uses primary color; column team uses secondary color so they're always visually distinct.
  const rowColor = getTeamColor(rowTeam);
  const colColor = getTeamColor2(colTeam);

  const digitsRevealed = rowDigits.length > 0 && colDigits.length > 0;
  const displayRowDigits: (number | null)[] = digitsRevealed ? rowDigits : Array(10).fill(null);
  const displayColDigits: (number | null)[] = digitsRevealed ? colDigits : Array(10).fill(null);

  const owner = new Map<string, GridCell>();
  for (const c of cells) owner.set(`${c.row}-${c.col}`, c);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
      {/* Column team banner */}
      <div
        className="f-oswald"
        style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#FBF5E6',
          background: colColor,
          borderRadius: '5px 5px 0 0',
          padding: '6px',
          minWidth: '420px',
        }}
      >
        {colTeam}
      </div>

      <div style={{ display: 'flex', minWidth: '420px' }}>
        {/* Row team banner (vertical) */}
        <div
          className="f-oswald"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#FBF5E6',
            background: rowColor,
            borderRadius: '0 0 0 5px',
            padding: '6px',
          }}
        >
          {rowTeam}
        </div>

        <div style={{ flex: 1 }}>
          {/* Column digit header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `28px repeat(10, 1fr)`,
            }}
          >
            <div style={{ background: 'var(--ink)' }} />
            {displayColDigits.map((d, j) => (
              <div
                key={j}
                className="f-mono"
                style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#FBF5E6',
                  background: colColor,
                  padding: '4px 0',
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                  opacity: d === null ? 0.5 : 1,
                }}
              >
                {d === null ? '?' : d}
              </div>
            ))}
          </div>

          {/* Rows */}
          {displayRowDigits.map((rd, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: `28px repeat(10, 1fr)`,
              }}
            >
              <div
                className="f-mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#FBF5E6',
                  background: rowColor,
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  opacity: rd === null ? 0.5 : 1,
                }}
              >
                {rd === null ? '?' : rd}
              </div>
              {displayColDigits.map((_, j) => {
                const cell = owner.get(`${i}-${j}`);
                const isMine = cell?.userId === currentUserId;
                const isLiveWinner =
                  liveHighlightRow === i && liveHighlightCol === j && digitsRevealed;
                return (
                  <div
                    key={j}
                    className="f-spectral"
                    style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: '10px',
                      lineHeight: 1.1,
                      padding: '2px',
                      overflow: 'hidden',
                      color: isLiveWinner ? '#1a1200' : isMine ? '#FBF5E6' : 'var(--ink)',
                      background: isLiveWinner
                        ? 'var(--gold)'
                        : isMine
                        ? 'var(--field-green)'
                        : 'var(--paper-card)',
                      border: isLiveWinner
                        ? '2px solid #B8860B'
                        : '1px solid var(--hairline)',
                      fontWeight: isLiveWinner ? 700 : 400,
                      zIndex: isLiveWinner ? 1 : 0,
                      position: 'relative',
                    }}
                    title={cell?.name ?? ''}
                  >
                    {cell ? shortLabel(cell.name) : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!digitsRevealed && cells.length > 0 && (
        <div
          className="f-mono"
          style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--mono-muted)', textAlign: 'center', marginTop: '6px' }}
        >
          Numbers not yet revealed — squares are assigned
        </div>
      )}
    </div>
  );
}
