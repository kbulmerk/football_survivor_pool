'use client';

import { useTransition } from 'react';
import { joinLeague } from '@/app/actions/league';

export function JoinLeagueButton({ leagueId }: { leagueId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      void joinLeague(leagueId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full bg-blue-600 px-5 py-1.5 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
    >
      {isPending ? 'Joining…' : 'Join league →'}
    </button>
  );
}
