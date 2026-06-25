'use client';

import { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WeekConfig } from '@/lib/schema';
import { setDeadline, openWeek, lockWeek, seedTestGames, backfillMissingPicks, clearPicksForWeek, resetWeek } from '@/app/actions/admin';

interface Props {
  leagueId: string;
  currentConfig: WeekConfig | null;
  allConfigs: WeekConfig[];
  selectedWeek: number;
}

function toLocalDatetime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function AdminWeekControls({ leagueId, currentConfig, allConfigs, selectedWeek }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [week, setWeek] = useState(selectedWeek);
  const [deadline, setDeadlineInput] = useState(() =>
    currentConfig?.deadline ? toLocalDatetime(new Date(currentConfig.deadline)) : ''
  );

  useEffect(() => {
    setWeek(selectedWeek);
    setDeadlineInput(
      currentConfig?.deadline ? toLocalDatetime(new Date(currentConfig.deadline)) : ''
    );
  }, [selectedWeek]);

  const configuredWeeks = new Set(allConfigs.map((c) => c.week));

  function handleWeekChange(newWeek: number) {
    setWeek(newWeek);
    router.replace(`/admin?league=${leagueId}&week=${newWeek}`);
  }

  function handleSeedTestGames() {
    startTransition(async () => {
      await seedTestGames(leagueId, week);
    });
  }

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

  function handleBackfill() {
    startTransition(async () => {
      await backfillMissingPicks(leagueId);
    });
  }

  function handleClearPicks() {
    if (!confirm(`Clear all picks for Week ${week}? This cannot be undone.`)) return;
    startTransition(async () => {
      await clearPicksForWeek(leagueId, week);
    });
  }

  function handleResetWeek() {
    if (!confirm(`Reset Week ${week}? This will delete all picks, games, and the week configuration. This cannot be undone.`)) return;
    startTransition(async () => {
      await resetWeek(leagueId, week);
    });
  }

  return (
    <div className="rounded-lg border p-4 bg-white space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Week</label>
          <select
            value={week}
            onChange={(e) => handleWeekChange(Number(e.target.value))}
            className="border rounded px-2 py-1.5 text-sm bg-white"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}{configuredWeeks.has(w) ? ' ✓' : ''}
              </option>
            ))}
          </select>
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

      <div className="flex gap-3 text-sm items-center flex-wrap">
        <button
          onClick={handleSeedTestGames}
          disabled={isPending}
          className="bg-purple-100 text-purple-700 rounded px-2 py-1 hover:bg-purple-200 disabled:opacity-40"
        >
          Load Test Games
        </button>
        <span className="text-gray-400 text-xs">(seeds 4 fake matchups for week {week})</span>
      </div>

      <div className="flex gap-3 text-sm items-center flex-wrap">
        <button
          onClick={handleBackfill}
          disabled={isPending}
          className="bg-orange-100 text-orange-700 rounded px-2 py-1 hover:bg-orange-200 disabled:opacity-40"
        >
          Backfill Missing Picks
        </button>
        <span className="text-gray-400 text-xs">(auto-assigns random teams for all locked weeks with no pick)</span>
      </div>

      {currentConfig && (
        <div className="flex gap-3 text-sm">
          <span className="text-gray-500">
            Week {currentConfig.week} is{' '}
            <strong>{currentConfig.isLocked ? 'locked' : currentConfig.isOpen ? 'open' : 'closed'}</strong>
          </span>
          <button
            onClick={handleOpenWeek}
            disabled={isPending || (currentConfig.isOpen && !currentConfig.isLocked)}
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
          <button
            onClick={handleClearPicks}
            disabled={isPending}
            className="bg-red-100 text-red-700 rounded px-2 py-1 hover:bg-red-200 disabled:opacity-40"
          >
            Clear Picks
          </button>
          <button
            onClick={handleResetWeek}
            disabled={isPending}
            className="bg-red-700 text-white rounded px-2 py-1 hover:bg-red-800 disabled:opacity-40"
          >
            Reset Week
          </button>
        </div>
      )}
    </div>
  );
}
