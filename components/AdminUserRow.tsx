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
    startTransition(async () => {
      await markPaid(leagueId, member.userId, 20);
    });
  }

  function handleToggleAlive() {
    startTransition(async () => {
      await overrideElimination(leagueId, member.userId, !member.isAlive, currentWeek);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white">
      <div>
        <p className="font-medium">{member.name ?? 'Unknown'}</p>
        <p className="text-xs text-gray-400">{member.phone ?? 'No phone'}</p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            member.isAlive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}
        >
          {member.isAlive ? 'Alive' : `Out Wk${member.eliminatedWeek ?? '?'}`}
        </span>

        {!member.isPaid && (
          <button
            onClick={handleMarkPaid}
            disabled={isPending}
            className="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 disabled:opacity-50"
          >
            Mark Paid
          </button>
        )}
        {member.isPaid && (
          <span className="text-xs text-green-600 font-semibold">Paid ✓</span>
        )}

        <button
          onClick={handleToggleAlive}
          disabled={isPending}
          className="text-xs bg-gray-200 text-gray-700 rounded px-2 py-1 hover:bg-gray-300 disabled:opacity-50"
        >
          {member.isAlive ? 'Eliminate' : 'Reinstate'}
        </button>
      </div>
    </div>
  );
}
