'use client';

import { useTransition, useState } from 'react';
import { createLeague } from '@/app/actions/admin';

export function CreateLeagueForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createLeague(formData);
      } catch (err) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">League Name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="2025 Survivor Pool"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Season (year)</label>
        <input
          name="season"
          type="number"
          required
          defaultValue={new Date().getFullYear()}
          min={2020}
          max={2099}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Buy-in ($)</label>
        <input
          name="buyIn"
          type="number"
          required
          defaultValue="20"
          min={1}
          step="0.01"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venmo Handle</label>
        <input
          name="venmoHandle"
          type="text"
          required
          placeholder="@yourhandle"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create League'}
      </button>
    </form>
  );
}
