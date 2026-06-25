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
    if (
      !confirm(
        `Delete "${leagueName}"? This permanently removes all members, picks, games, and config. This cannot be undone.`
      )
    )
      return;
    startTransition(async () => {
      await deleteLeague(leagueId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="bg-red-600 text-white text-sm rounded px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
    >
      {isPending ? 'Deleting…' : 'Delete League'}
    </button>
  );
}
