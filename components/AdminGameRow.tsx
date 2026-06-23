'use client';

import { useTransition } from 'react';
import type { Game } from '@/lib/schema';
import { excludeGame } from '@/app/actions/admin';

export function AdminGameRow({ game, leagueId }: { game: Game; leagueId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleExclude() {
    startTransition(async () => {
      await excludeGame(game.id, !game.isExcluded);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white">
      <div>
        <p className="font-medium text-sm">
          {game.awayTeam} @ {game.homeTeam}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(game.startTime).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {game.winner && (
          <span className="text-xs text-gray-500">
            Winner: <strong>{game.winner}</strong>
          </span>
        )}
        <button
          onClick={handleToggleExclude}
          disabled={isPending}
          className={`text-xs rounded px-2 py-1 disabled:opacity-50 ${
            game.isExcluded
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {game.isExcluded ? 'Un-exclude' : 'Exclude'}
        </button>
      </div>
    </div>
  );
}
