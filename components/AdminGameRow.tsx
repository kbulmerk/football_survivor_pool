'use client';

import { useTransition } from 'react';
import type { Game } from '@/lib/schema';
import { excludeGame } from '@/app/actions/admin';

export function AdminGameRow({ game }: { game: Game }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleExclude() {
    startTransition(async () => { await excludeGame(game.id, !game.isExcluded); });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
      <div>
        <div className="f-oswald" style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', color: 'var(--ink)' }}>
          {game.awayTeam} @ {game.homeTeam}
        </div>
        <div className="f-mono" style={{ fontSize: '9.5px', color: 'var(--mono-muted)', marginTop: '2px' }} suppressHydrationWarning>
          {new Date(game.startTime).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {game.winner && (
          <span className="f-mono" style={{ fontSize: '10px', color: 'var(--mono-muted)' }}>
            W: <strong>{game.winner}</strong>
          </span>
        )}
        <button
          onClick={handleToggleExclude}
          disabled={isPending}
          className="f-oswald"
          style={{
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: game.isExcluded ? 'var(--mono-muted)' : 'var(--varsity-red)',
            border: `1.5px solid ${game.isExcluded ? 'var(--hairline)' : '#d99b96'}`,
            borderRadius: '4px',
            padding: '6px 11px',
            background: 'transparent',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {game.isExcluded ? 'Un-exclude' : 'Exclude'}
        </button>
      </div>
    </div>
  );
}
