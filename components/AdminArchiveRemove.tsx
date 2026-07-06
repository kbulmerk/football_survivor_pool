'use client';

import { useTransition } from 'react';
import { removeCompletedLeague } from '@/app/actions/admin';

interface Props {
  leagueId: string;
  leagueName: string;
}

export function AdminArchiveRemove({ leagueId, leagueName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    if (!confirm(`Remove "${leagueName}" from the archive? The league data is kept but it will no longer appear here.`)) return;
    startTransition(async () => { await removeCompletedLeague(leagueId); });
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="f-oswald"
      style={{
        fontWeight: 600,
        fontSize: '12px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: 'var(--varsity-red)',
        border: '1.5px solid var(--varsity-red)',
        borderRadius: '4px',
        padding: '8px 12px',
        background: 'transparent',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {isPending ? 'Removing…' : 'Remove'}
    </button>
  );
}
