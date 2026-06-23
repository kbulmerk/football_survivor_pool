interface Member {
  userId: string;
  name: string | null;
  isAlive: boolean;
  isPaid: boolean;
  eliminatedWeek: number | null;
}

export function StandingsTable({ members }: { members: Member[] }) {
  const alive = members.filter((m) => m.isAlive);
  const eliminated = members.filter((m) => !m.isAlive);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            <th className="text-left px-4 py-2">Player</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {alive.map((m) => (
            <tr key={m.userId} className="bg-white">
              <td className="px-4 py-3 font-medium">{m.name ?? 'Unknown'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                  ✅ Alive
                </span>
              </td>
              <td className="px-4 py-3">
                {m.isPaid ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-orange-500">Pending</span>
                )}
              </td>
            </tr>
          ))}
          {eliminated.map((m) => (
            <tr key={m.userId} className="bg-red-50">
              <td className="px-4 py-3 font-medium text-gray-400 line-through">
                {m.name ?? 'Unknown'}
              </td>
              <td className="px-4 py-3 text-red-500 text-xs">
                ❌ Out{m.eliminatedWeek != null ? ` — Week ${m.eliminatedWeek}` : ''}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
