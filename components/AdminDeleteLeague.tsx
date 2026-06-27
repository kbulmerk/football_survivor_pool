'use client';

import { useTransition } from 'react';
import { deleteLeague } from '@/app/actions/admin';

interface Props {
  leagueId: string;
  leagueName: string;
}

export function AdminDeleteLeague({ leagueId, leagueName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${leagueName}"? This permanently removes all members, picks, games, and config. This cannot be undone.`)) return;
    startTransition(async () => { await deleteLeague(leagueId); });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="f-oswald"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: '12.5px',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color: '#FBF5E6',
        background: 'var(--varsity-red)',
        border: 'none',
        borderRadius: '4px',
        padding: '10px',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.7 : 1,
      }}
    >
      {isPending ? 'Deleting…' : 'Delete League'}
    </button>
  );
}
