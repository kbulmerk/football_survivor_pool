import Link from 'next/link';
import type { League } from '@/lib/schema';

interface Props {
  leagues: League[];
  targetPath: '/league' | '/pick';
  title: string;
}

export function LeaguePicker({ leagues, targetPath, title }: Props) {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <p className="text-gray-500 mb-4">Select a league to continue:</p>
      <div className="flex flex-col gap-4">
        {leagues.map((l) => (
          <Link
            key={l.id}
            href={`${targetPath}?leagueId=${l.id}`}
            className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold">{l.name}</div>
            <div className="text-sm text-gray-500">Season {l.season}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
