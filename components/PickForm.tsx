'use client';

import { useState, useTransition } from 'react';
import type { Game } from '@/lib/schema';
import { GameCard } from './GameCard';
import { submitPick } from '@/app/actions/pick';
import { Countdown } from './Countdown';

interface PickFormProps {
  leagueId: string;
  week: number;
  games: Game[];
  usedTeams: string[];
  currentPick: string | null;
  deadline: string;
}

export function PickForm({
  leagueId,
  week,
  games,
  usedTeams,
  currentPick,
  deadline,
}: PickFormProps) {
  const [selected, setSelected] = useState<string | null>(currentPick);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selected) return;
    setMessage(null);

    startTransition(async () => {
      const result = await submitPick(leagueId, week, selected);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: `Pick saved: ${selected} to lose.` });
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Deadline:</p>
        <Countdown deadline={deadline} />
      </div>

      <div className="space-y-4 mb-6">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            selected={selected}
            usedTeams={usedTeams}
            onSelect={setSelected}
          />
        ))}
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 mb-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || isPending}
        className="w-full rounded-full bg-blue-600 py-3 text-white font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {isPending ? 'Saving…' : selected ? `Confirm: ${selected} to lose` : 'Select a team'}
      </button>
    </div>
  );
}
