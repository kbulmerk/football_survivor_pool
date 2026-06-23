import type { Pick } from '@/lib/schema';

interface Member {
  userId: string;
  name: string | null;
}

interface PickHistoryProps {
  picks: Pick[];
  members: Member[];
}

export function PickHistory({ picks, members }: PickHistoryProps) {
  const nameMap = Object.fromEntries(members.map((m) => [m.userId, m.name ?? 'Unknown']));

  const weeks = [...new Set(picks.map((p) => p.week))].sort((a, b) => a - b);

  if (picks.length === 0) {
    return <p className="text-gray-500 text-sm">No picks submitted yet.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            <th className="text-left px-4 py-2">Player</th>
            {weeks.map((w) => (
              <th key={w} className="text-left px-4 py-2">
                Wk {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.userId} className="bg-white">
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                {nameMap[member.userId]}
              </td>
              {weeks.map((w) => {
                const pick = picks.find(
                  (p) => p.userId === member.userId && p.week === w
                );
                return (
                  <td key={w} className="px-4 py-3 whitespace-nowrap">
                    {pick ? (
                      <span
                        className={
                          pick.result === 'eliminated'
                            ? 'text-red-500'
                            : pick.result === 'correct'
                            ? 'text-green-600'
                            : 'text-gray-700'
                        }
                      >
                        {pick.teamPicked}
                        {pick.result === 'eliminated' && ' ❌'}
                        {pick.result === 'correct' && ' ✓'}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
