'use client';

import { useState } from 'react';
import { CreateLeagueForm } from '@/components/CreateLeagueForm';
import { CreateSquaresLeagueForm } from '@/components/CreateSquaresLeagueForm';

export function CreateLeagueTypeToggle() {
  const [gameType, setGameType] = useState<'survivor' | 'squares'>('survivor');

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['survivor', 'squares'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setGameType(type)}
            className={`flex-1 rounded px-4 py-2 text-sm font-semibold capitalize border ${
              gameType === type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {type === 'survivor' ? 'Survivor Pool' : 'Squares'}
          </button>
        ))}
      </div>

      {gameType === 'survivor' ? <CreateLeagueForm /> : <CreateSquaresLeagueForm />}
    </div>
  );
}
