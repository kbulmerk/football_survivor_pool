'use client';

import type { Game } from '@/lib/schema';

interface GameCardProps {
  game: Game;
  selected: string | null;
  usedTeams: string[];
  onSelect: (team: string) => void;
}

export function GameCard({ game, selected, usedTeams, onSelect }: GameCardProps) {
  const teams = [game.awayTeam, game.homeTeam];

  const startLabel = new Date(game.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="text-xs text-gray-400 mb-3">{startLabel}</p>
      <div className="flex gap-3">
        {teams.map((team) => {
          const isUsed = usedTeams.includes(team);
          const isSelected = selected === team;

          return (
            <button
              key={team}
              onClick={() => !isUsed && onSelect(team)}
              disabled={isUsed}
              className={`flex-1 rounded-lg border-2 py-3 px-2 text-sm font-semibold transition-all
                ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : ''}
                ${isUsed ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through' : ''}
                ${!isSelected && !isUsed ? 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer' : ''}
              `}
            >
              {team}
              {isUsed && <span className="block text-xs font-normal">Used</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
