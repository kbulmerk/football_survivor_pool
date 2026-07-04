'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lockSignup, generateGrid, setQuarterScore } from '@/app/actions/squares';

export function SquaresAdminControls({
  leagueId,
  signupLocked,
  isLocked,
  homeTeam,
  awayTeam,
}: {
  leagueId: string;
  signupLocked: boolean;
  isLocked: boolean;
  homeTeam: string;
  awayTeam: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [quarter, setQuarter] = useState(1);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  function handleLockSignup() {
    if (!confirm('Lock signups? No new players will be able to join. You can still generate the grid afterward.')) return;
    setError(null);
    startTransition(async () => {
      const res = await lockSignup(leagueId);
      if ('error' in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleGenerateGrid() {
    if (!confirm('Generate the grid? This assigns all 100 squares and reveals the numbers. It cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const res = await generateGrid(leagueId);
      if ('error' in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleScore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await setQuarterScore(leagueId, quarter, Number(homeScore), Number(awayScore));
      if ('error' in res) {
        setError(res.error);
      } else {
        setHomeScore('');
        setAwayScore('');
        router.refresh();
      }
    });
  }

  return (
    <div
      style={{
        marginTop: '18px',
        padding: '14px',
        border: '1.5px dashed var(--ink)',
        borderRadius: '6px',
        background: 'var(--paper-card)',
      }}
    >
      <div
        className="f-mono"
        style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--varsity-red)', marginBottom: '10px' }}
      >
        ADMIN CONTROLS
      </div>

      {!signupLocked ? (
        <button
          type="button"
          onClick={handleLockSignup}
          disabled={isPending}
          className="btn-primary"
          style={{ width: '100%', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? 'Locking…' : 'Lock Signups'}
        </button>
      ) : !isLocked ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="f-mono" style={{ fontSize: '10px', color: 'var(--field-green)', letterSpacing: '1px' }}>
            ✓ Signups locked
          </div>
          <button
            type="button"
            onClick={handleGenerateGrid}
            disabled={isPending}
            className="btn-primary"
            style={{ width: '100%', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? 'Generating…' : 'Generate Grid'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleScore} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="f-oswald" style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', color: 'var(--ink)' }}>
            Enter / override quarter score
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <label className="f-mono" style={{ fontSize: '10px', color: 'var(--mono-muted)' }}>
              Quarter
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                style={{ width: '100%', marginTop: '3px', padding: '7px', border: '1.5px solid var(--ink)', borderRadius: '4px', background: 'white' }}
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
            </label>
            <label className="f-mono" style={{ fontSize: '10px', color: 'var(--mono-muted)' }}>
              {homeTeam} (home)
              <input
                type="number"
                min={0}
                required
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                style={{ width: '100%', marginTop: '3px', padding: '7px', border: '1.5px solid var(--ink)', borderRadius: '4px', background: 'white', boxSizing: 'border-box' }}
              />
            </label>
            <label className="f-mono" style={{ fontSize: '10px', color: 'var(--mono-muted)' }}>
              {awayTeam} (away)
              <input
                type="number"
                min={0}
                required
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                style={{ width: '100%', marginTop: '3px', padding: '7px', border: '1.5px solid var(--ink)', borderRadius: '4px', background: 'white', boxSizing: 'border-box' }}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="btn-outline"
            style={{ cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? 'Saving…' : 'Save Quarter Score'}
          </button>
        </form>
      )}

      {error && (
        <p className="f-spectral" style={{ color: 'var(--varsity-red)', fontSize: '13px', marginTop: '10px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
