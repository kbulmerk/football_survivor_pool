'use client';

import { useState, useTransition } from 'react';
import { joinLeague } from '@/app/actions/league';
import { savePhoneAndJoin } from '@/app/actions/user';

export function JoinLeagueButton({
  leagueId,
  hasPhone,
}: {
  leagueId: string;
  hasPhone: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState('');

  function handleJoinClick() {
    if (hasPhone) {
      startTransition(() => { void joinLeague(leagueId); });
    } else {
      setShowModal(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await savePhoneAndJoin(leagueId, phone);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        onClick={handleJoinClick}
        disabled={isPending}
        className="rounded-full bg-blue-600 px-5 py-1.5 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? 'Joining…' : 'Join league →'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-1">Enter your phone number</h2>
            <p className="text-sm text-gray-500 mb-4">
              We&apos;ll send you SMS reminders to make your weekly pick.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
              <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-0.5 shrink-0"
                  required
                />
                I consent to receive SMS text messages for league updates and weekly pick reminders.
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); setSmsConsent(false); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !smsConsent}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? 'Joining…' : 'Join league →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
