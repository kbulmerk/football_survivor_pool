'use client';

import { useRouter } from 'next/navigation';
import type { League } from '@/lib/schema';

interface Props {
  leagues: League[];
  selectedLeagueId: string;
}

export function AdminLeagueSelector({ leagues, selectedLeagueId }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedLeagueId}
      onChange={(e) => router.replace(`/admin?league=${e.target.value}`)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
        zIndex: 1,
      }}
    >
      {leagues.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} ({l.season})
        </option>
      ))}
    </select>
  );
}
