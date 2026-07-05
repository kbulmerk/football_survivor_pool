'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lockSignup, generateSquares, generateNumbers } from '@/app/actions/squares';
import { completeLeague } from '@/app/actions/admin';

export function SquaresAdminControls({
  leagueId,
  signupLocked,
  squaresAssigned,
  isLocked,
  quartersRecorded,
}: {
  leagueId: string;
  signupLocked: boolean;
  squaresAssigned: boolean;
  isLocked: boolean;
  quartersRecorded: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLockSignup() {
    if (!confirm('Lock signups? No new players will be able to join.')) return;
    setError(null);
    startTransition(async () => {
      const res = await lockSignup(leagueId);
      if ('error' in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleGenerateSquares() {
    if (!confirm('Assign squares to players? This randomly deals all 100 squares. It cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const res = await generateSquares(leagueId);
      if ('error' in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleGenerateNumbers() {
    if (!confirm('Reveal the numbers? This assigns the 0-9 digit headers and fully locks the grid. It cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const res = await generateNumbers(leagueId);
      if ('error' in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleComplete() {
    if (!confirm('Mark this league as complete? It will be removed from the dashboard. This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await completeLeague(leagueId);
        router.push('/admin');
      } catch {
        setError('Failed to complete league.');
      }
    });
  }

  const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
    width: '100%',
    cursor: active && !isPending ? 'pointer' : 'not-allowed',
    opacity: active && !isPending ? 1 : 0.45,
    position: 'relative',
  });

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Step 1 */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleLockSignup}
            disabled={signupLocked || isPending}
            className="btn-primary"
            style={stepStyle(!signupLocked, signupLocked)}
          >
            {signupLocked ? '✓ Signups Locked' : 'Lock Signups'}
          </button>
        </div>

        {/* Step 2 */}
        <button
          type="button"
          onClick={handleGenerateSquares}
          disabled={!signupLocked || squaresAssigned || isPending}
          className="btn-primary"
          style={stepStyle(signupLocked && !squaresAssigned, squaresAssigned)}
        >
          {squaresAssigned ? '✓ Squares Assigned' : 'Generate Squares'}
        </button>

        {/* Step 3 */}
        <button
          type="button"
          onClick={handleGenerateNumbers}
          disabled={!squaresAssigned || isLocked || isPending}
          className="btn-primary"
          style={stepStyle(squaresAssigned && !isLocked, isLocked)}
        >
          {isLocked ? '✓ Numbers Revealed' : 'Generate Numbers'}
        </button>
      </div>

      {error && (
        <p className="f-spectral" style={{ color: 'var(--varsity-red)', fontSize: '13px', marginTop: '10px' }}>
          {error}
        </p>
      )}

      {isLocked && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--hairline)', paddingTop: '14px' }}>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending}
            className="btn-outline"
            style={{ width: '100%', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, borderColor: 'var(--mono-muted)', color: 'var(--text-muted)' }}
          >
            {quartersRecorded >= 4 ? 'Complete League' : 'Complete League (game still in progress)'}
          </button>
        </div>
      )}
    </div>
  );
}
