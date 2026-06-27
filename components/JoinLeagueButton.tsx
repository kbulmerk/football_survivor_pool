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
        className="f-oswald"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          background: 'var(--varsity-red)',
          color: '#FBF5E6',
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          padding: '9px 16px',
          borderRadius: '4px',
          border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Joining…' : 'Join league →'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,26,16,0.6)' }}>
          <div style={{ background: 'var(--paper-card)', border: '1.5px solid var(--ink)', borderRadius: '7px', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)', padding: '24px', width: '100%', maxWidth: '360px', margin: '0 16px' }}>
            <h2 className="f-oswald" style={{ fontWeight: 700, fontSize: '22px', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '4px' }}>
              Enter Your Phone
            </h2>
            <p className="f-spectral" style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.45 }}>
              We&apos;ll send you SMS reminders to make your weekly pick.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="f-mono"
                style={{
                  width: '100%',
                  border: '1.5px solid var(--ink)',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  background: 'white',
                  color: 'var(--ink)',
                  boxSizing: 'border-box',
                }}
                autoFocus
                required
              />
              <label className="f-spectral" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4 }}>
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                  required
                />
                I consent to receive SMS text messages for league updates and weekly pick reminders.
              </label>
              {error && (
                <p className="f-spectral" style={{ color: 'var(--varsity-red)', fontSize: '13px' }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); setSmsConsent(false); }}
                  className="f-oswald"
                  style={{ padding: '8px 14px', fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--mono-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !smsConsent}
                  className="f-oswald"
                  style={{
                    padding: '9px 16px',
                    fontSize: '13px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: '#FBF5E6',
                    background: 'var(--varsity-red)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isPending || !smsConsent ? 'not-allowed' : 'pointer',
                    opacity: isPending || !smsConsent ? 0.6 : 1,
                  }}
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
