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
    <div>
      <label className="block text-xs text-gray-500 mb-1">League</label>
      <select
        value={selectedLeagueId}
        onChange={(e) => router.replace(`/admin?league=${e.target.value}`)}
        className="border rounded px-2 py-1.5 text-sm bg-white"
      >
        {leagues.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({l.season})
          </option>
        ))}
      </select>
    </div>
  );
}
