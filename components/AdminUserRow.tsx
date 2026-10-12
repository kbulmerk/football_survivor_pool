'use client';

import { useTransition } from 'react';
import { markPaid, overrideElimination, removeMember, setPickResult } from '@/app/actions/admin';

interface Member {
  userId: string;
  name: string | null;
  phone: string | null;
  isAlive: boolean;
  isPaid: boolean;
  eliminatedWeek: number | null;
}

interface WeekPick {
  team: string;
  result: 'pending' | 'correct' | 'eliminated' | null;
}

export function AdminUserRow({ member, leagueId, currentWeek, gameType = 'survivor', pick = null }: { member: Member; leagueId: string; currentWeek: number; gameType?: string; pick?: WeekPick | null }) {
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => { await markPaid(leagueId, member.userId, 20); });
  }

  function handleToggleAlive() {
    startTransition(async () => { await overrideElimination(leagueId, member.userId, !member.isAlive, currentWeek); });
  }

  function handleSetResult(result: 'pending' | 'correct' | 'eliminated') {
    startTransition(async () => { await setPickResult(leagueId, member.userId, currentWeek, result); });
  }

  function handleRemove() {
    if (!confirm(`Remove ${member.name ?? 'this member'} from the pool?`)) return;
    startTransition(async () => { await removeMember(leagueId, member.userId); });
  }

  const isSquares = gameType === 'squares';

  return (
    <div style={{ padding: '14px 14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p className="f-spectral" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', margin: 0 }}>
          {member.name ?? 'Unknown'}
        </p>
        <p className="f-mono" style={{ fontSize: '11px', color: 'var(--mono-muted)', marginTop: '2px', margin: 0 }}>
          {member.phone ?? 'No phone'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        {/* Paid status */}
        {member.isPaid ? (
          <span className="f-oswald" style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', color: 'var(--field-green)' }}>
            Paid ✓
          </span>
        ) : (
          <button
            onClick={handleMarkPaid}
            disabled={isPending}
            className="f-oswald"
            style={{
              fontWeight: 600,
              fontSize: '10px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--amber-text)',
              border: '1.5px solid #d8b873',
              borderRadius: '4px',
              padding: '5px 8px',
              background: 'transparent',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Mark Paid
          </button>
        )}

        {isSquares ? (
          /* Squares: remove member instead of alive/eliminate controls */
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="f-oswald"
            style={{
              fontWeight: 600,
              fontSize: '10px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--varsity-red)',
              border: '1.5px solid #d99b96',
              borderRadius: '4px',
              padding: '5px 8px',
              background: 'transparent',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Remove
          </button>
        ) : (
          <>
            {/* Alive/Out chip */}
            <span
              className="f-oswald"
              style={{
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: member.isAlive ? 'var(--field-green)' : 'var(--varsity-red)',
                background: member.isAlive ? '#e0e8d6' : '#F4DADA',
                borderRadius: '3px',
                padding: '5px 8px',
              }}
            >
              {member.isAlive ? 'Alive' : `Out W${member.eliminatedWeek ?? '?'}`}
            </span>

            {/* Eliminate / Reinstate */}
            <button
              onClick={handleToggleAlive}
              disabled={isPending}
              className="f-oswald"
              style={{
                fontWeight: 600,
                fontSize: '10px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: member.isAlive ? 'var(--varsity-red)' : 'var(--field-green)',
                border: `1.5px solid ${member.isAlive ? '#d99b96' : '#a9bb9f'}`,
                borderRadius: '4px',
                padding: '5px 8px',
                background: 'transparent',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {member.isAlive ? 'Eliminate' : 'Reinstate'}
            </button>
          </>
        )}
      </div>
    </div>
    {!isSquares && pick && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--hairline)' }}>
        <span className="f-mono" style={{ fontSize: '11px', color: 'var(--mono-muted)' }}>
          W{currentWeek} PICK: {pick.team} · {(pick.result ?? 'pending').toUpperCase()}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {([['correct', 'Safe', 'var(--field-green)', '#a9bb9f'], ['eliminated', 'Out', 'var(--varsity-red)', '#d99b96'], ['pending', 'Reset', 'var(--amber-text)', '#d8b873']] as const).map(([value, label, color, border]) => (
            <button
              key={value}
              onClick={() => handleSetResult(value)}
              disabled={isPending || (pick.result ?? 'pending') === value}
              className="f-oswald"
              style={{
                fontWeight: 600,
                fontSize: '10px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color,
                border: `1.5px solid ${border}`,
                borderRadius: '4px',
                padding: '4px 8px',
                background: 'transparent',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending || (pick.result ?? 'pending') === value ? 0.4 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
