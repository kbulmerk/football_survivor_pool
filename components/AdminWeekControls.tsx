'use client';

import { useTransition, useState } from 'react';
import type { WeekConfig } from '@/lib/schema';
import { setDeadline, openWeek, lockWeek } from '@/app/actions/admin';

interface Props {
  leagueId: string;
  currentConfig: WeekConfig | null;
}

export function AdminWeekControls({ leagueId, currentConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [week, setWeek] = useState(currentConfig?.week ?? 1);
  const [deadline, setDeadlineInput] = useState('');

  function handleSetDeadline() {
    if (!deadline) return;
    startTransition(async () => {
      await setDeadline(leagueId, week, new Date(deadline));
    });
  }

  function handleOpenWeek() {
    startTransition(async () => {
      await openWeek(leagueId, week);
    });
  }

  function handleLockWeek() {
    startTransition(async () => {
      await lockWeek(leagueId, week);
    });
  }

  return (
    <div className="rounded-lg border p-4 bg-white space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Week</label>
          <input
            type="number"
            min={1}
            max={18}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm"
          />
        </div>
        <button
          onClick={handleSetDeadline}
          disabled={isPending || !deadline}
          className="bg-blue-600 text-white text-sm rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
        >
          Set Deadline
        </button>
      </div>

      {currentConfig && (
        <div className="flex gap-3 text-sm">
          <span className="text-gray-500">
            Week {currentConfig.week} is{' '}
            <strong>{currentConfig.isLocked ? 'locked' : currentConfig.isOpen ? 'open' : 'closed'}</strong>
          </span>
          <button
            onClick={handleOpenWeek}
            disabled={isPending || currentConfig.isOpen}
            className="bg-green-100 text-green-700 rounded px-2 py-1 hover:bg-green-200 disabled:opacity-40"
          >
            Open Picks
          </button>
          <button
            onClick={handleLockWeek}
            disabled={isPending || currentConfig.isLocked}
            className="bg-red-100 text-red-700 rounded px-2 py-1 hover:bg-red-200 disabled:opacity-40"
          >
            Lock Picks
          </button>
        </div>
      )}
    </div>
  );
}
