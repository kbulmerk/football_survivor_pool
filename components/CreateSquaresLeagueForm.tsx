'use client';

import { useState, useTransition } from 'react';
import { createLeague, getGamesForWeek } from '@/app/actions/admin';
import { SQUARES_ROUNDS } from '@/lib/espn';

type WeekGame = { id: string; homeTeam: string; awayTeam: string; startTime: string };

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-spline-mono-var), monospace',
  fontSize: '10px',
  letterSpacing: '2px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: '7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fdfaf0',
  border: '1.5px solid var(--ink)',
  borderRadius: '3px',
  padding: '13px 14px',
  fontFamily: 'var(--font-spectral-var), Georgia, serif',
  fontSize: '15px',
  color: 'var(--ink)',
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
};

export function CreateSquaresLeagueForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [name, setName] = useState('');
  const [season, setSeason] = useState(currentYear);
  const [roundKey, setRoundKey] = useState('2-1');
  const [seasonType, week] = roundKey.split('-').map(Number);
  const [games, setGames] = useState<WeekGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [espnGameId, setEspnGameId] = useState('');
  const [buyIn, setBuyIn] = useState(20);
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <input type="hidden" name="gameType" value="squares" />
      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="seasonType" value={seasonType} />

      <div>
        <label className="f-mono" style={labelStyle}>Pool Name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Eagles vs. Patriots Squares"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, color: name ? 'var(--ink)' : '#a99878' }}
        />
      </div>

      <div>
        <label className="f-mono" style={labelStyle}>Season (Year)</label>
        <input
          name="season"
          type="number"
          required
          value={season}
          min={2020}
          max={2099}
          onChange={(e) => setSeason(Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="f-mono" style={labelStyle}>Round</label>
        <div style={{ position: 'relative' }}>
          <select
            value={roundKey}
            onChange={(e) => {
              const key = e.target.value;
              setRoundKey(key);
              const [st, w] = key.split('-').map(Number);
              loadGames(w, season, st);
            }}
            style={selectStyle}
          >
            {SQUARES_ROUNDS.map((r) => (
              <option key={`${r.seasonType}-${r.week}`} value={`${r.seasonType}-${r.week}`}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="f-mono" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '13px' }}>▾</span>
        </div>
        <button
          type="button"
          onClick={() => loadGames(week, season, seasonType)}
          className="f-spectral"
          style={{ marginTop: '6px', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {loadingGames ? 'Loading games…' : 'Load games for this round'}
        </button>
      </div>

      <div>
        <label className="f-mono" style={labelStyle}>Game to Track</label>
        <div style={{ position: 'relative' }}>
          <select
            name="espnGameId"
            required
            value={espnGameId}
            onChange={(e) => setEspnGameId(e.target.value)}
            disabled={games.length === 0}
            style={{ ...selectStyle, color: espnGameId ? 'var(--ink)' : '#a99878', opacity: games.length === 0 ? 0.6 : 1 }}
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
          <span className="f-mono" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '13px' }}>▾</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label className="f-mono" style={labelStyle}>Buy-in ($)</label>
          <input
            name="buyIn"
            type="number"
            required
            value={buyIn}
            min={1}
            step="0.01"
            onChange={(e) => setBuyIn(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="f-mono" style={labelStyle}>Venmo Handle</label>
          <input
            name="venmoHandle"
            type="text"
            required
            placeholder="@yourhandle"
            style={{ ...inputStyle, color: '#a99878' }}
            onFocus={(e) => (e.target.style.color = 'var(--ink)')}
            onBlur={(e) => { if (!e.target.value) e.target.style.color = '#a99878'; }}
          />
        </div>
      </div>

      {/* Quarter payouts */}
      <div style={{ borderTop: '1px solid rgba(34,26,16,0.15)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--text-muted)' }}>
            QUARTER PAYOUTS <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>(% of total pot)</span>
          </div>
          <span className="f-oswald" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: payoutSum === 100 ? 'var(--field-green)' : 'var(--varsity-red)' }}>
            {payoutSum === 100 ? 'Total 100% ✓' : `Total ${payoutSum}%`}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
          {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (
            <div key={q}>
              <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--gold)', marginBottom: '6px' }}>Q{i + 1}</div>
              <input
                name={`payout${q.toUpperCase()}`}
                type="number"
                required
                min={0}
                max={100}
                value={payouts[q]}
                onChange={(e) => setPayouts({ ...payouts, [q]: Number(e.target.value) })}
                style={{ ...inputStyle, textAlign: 'center', padding: '11px 8px', fontFamily: 'var(--font-oswald-var), sans-serif', fontWeight: 700, fontSize: '17px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="f-spectral" style={{ fontSize: '13px', color: 'var(--varsity-red)' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || payoutSum !== 100}
        className="f-oswald"
        style={{ background: 'var(--varsity-red)', color: '#f7f0dc', padding: '15px', textAlign: 'center', borderRadius: '3px', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '3px 3px 0 rgba(34,26,16,0.20)', border: 'none', cursor: isPending || payoutSum !== 100 ? 'not-allowed' : 'pointer', opacity: isPending || payoutSum !== 100 ? 0.6 : 1, width: '100%' }}
      >
        {isPending ? 'Creating…' : 'Create Squares Pool →'}
      </button>
    </form>
  );
}
