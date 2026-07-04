'use client';

import { useState, useTransition } from 'react';
import { createLeague, getGamesForWeek } from '@/app/actions/admin';
import { SQUARES_ROUNDS } from '@/lib/espn';

type WeekGame = { id: string; homeTeam: string; awayTeam: string; startTime: string };

export function CreateSquaresLeagueForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [season, setSeason] = useState(currentYear);
  // Selected round encoded as "seasonType-week" (e.g. "2-7" or "3-5" for Super Bowl).
  const [roundKey, setRoundKey] = useState('2-1');
  const [seasonType, week] = roundKey.split('-').map(Number);
  const [games, setGames] = useState<WeekGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [espnGameId, setEspnGameId] = useState('');

  const [payouts, setPayouts] = useState({ q1: 25, q2: 25, q3: 25, q4: 25 });
  const payoutSum = payouts.q1 + payouts.q2 + payouts.q3 + payouts.q4;

  function loadGames(nextWeek: number, nextSeason: number, nextSeasonType: number) {
    setLoadingGames(true);
    setEspnGameId('');
    startTransition(async () => {
      try {
        const result = await getGamesForWeek(nextWeek, nextSeason, nextSeasonType);
        setGames(result);
      } catch {
        setGames([]);
      } finally {
        setLoadingGames(false);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (payoutSum !== 100) {
      setError('Quarter payouts must add up to 100%.');
      return;
    }
    if (!espnGameId) {
      setError('Please select a game to track.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createLeague(formData);
      } catch (err) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="gameType" value="squares" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pool Name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Eagles vs. Patriots Squares"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Season (year)</label>
        <input
          name="season"
          type="number"
          required
          value={season}
          min={2020}
          max={2099}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="seasonType" value={seasonType} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
        <select
          value={roundKey}
          onChange={(e) => {
            const key = e.target.value;
            setRoundKey(key);
            const [st, w] = key.split('-').map(Number);
            loadGames(w, season, st);
          }}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          {SQUARES_ROUNDS.map((r) => (
            <option key={`${r.seasonType}-${r.week}`} value={`${r.seasonType}-${r.week}`}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => loadGames(week, season, seasonType)}
          className="mt-2 text-sm text-blue-600 underline"
        >
          {loadingGames ? 'Loading games…' : 'Load games for this round'}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Game to track</label>
        <select
          name="espnGameId"
          required
          value={espnGameId}
          onChange={(e) => setEspnGameId(e.target.value)}
          disabled={games.length === 0}
          className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
        >
          <option value="">
            {games.length === 0 ? 'Load games first…' : 'Select a matchup…'}
          </option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.awayTeam} @ {g.homeTeam} — {new Date(g.startTime).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Buy-in ($)</label>
        <input
          name="buyIn"
          type="number"
          required
          defaultValue="20"
          min={1}
          step="0.01"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venmo Handle</label>
        <input
          name="venmoHandle"
          type="text"
          required
          placeholder="@yourhandle"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quarter Payouts (% of total pot)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (
            <div key={q}>
              <span className="block text-xs text-gray-500 mb-1">Q{i + 1}</span>
              <input
                name={`payout${q.toUpperCase()}`}
                type="number"
                required
                min={0}
                max={100}
                value={payouts[q]}
                onChange={(e) => setPayouts({ ...payouts, [q]: Number(e.target.value) })}
                className="w-full border rounded px-2 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <p className={`text-xs mt-1 ${payoutSum === 100 ? 'text-gray-500' : 'text-red-600'}`}>
          Total: {payoutSum}% {payoutSum === 100 ? '✓' : '(must equal 100%)'}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending || payoutSum !== 100}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create Squares Pool'}
      </button>
    </form>
  );
}
