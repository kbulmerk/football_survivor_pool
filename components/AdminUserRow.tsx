'use client';

import { useTransition } from 'react';
import { markPaid, overrideElimination } from '@/app/actions/admin';

interface Member {
  userId: string;
  name: string | null;
  phone: string | null;
  isAlive: boolean;
  isPaid: boolean;
  eliminatedWeek: number | null;
}

export function AdminUserRow({ member, leagueId, currentWeek }: { member: Member; leagueId: string; currentWeek: number }) {
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => { await markPaid(leagueId, member.userId, 20); });
  }

  function handleToggleAlive() {
    startTransition(async () => { await overrideElimination(leagueId, member.userId, !member.isAlive, currentWeek); });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px' }}>
      <div>
        <p className="f-spectral" style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', margin: 0 }}>
          {member.name ?? 'Unknown'}
        </p>
        <p className="f-mono" style={{ fontSize: '11px', color: 'var(--mono-muted)', marginTop: '2px', margin: 0 }}>
          {member.phone ?? 'No phone'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
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
      </div>
    </div>
  );
}
