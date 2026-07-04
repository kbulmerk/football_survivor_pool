'use client';

import { useTransition, useState } from 'react';
import { createLeague } from '@/app/actions/admin';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-spline-mono-var), monospace',
  fontSize: '10px',
  letterSpacing: '2px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: '7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fdfaf0',
  border: '1.5px solid var(--ink)',
  borderRadius: '3px',
  padding: '13px 14px',
  fontFamily: 'var(--font-spectral-var), Georgia, serif',
  fontSize: '15px',
  color: 'var(--ink)',
  boxSizing: 'border-box',
  outline: 'none',
};

export function CreateLeagueForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState(20);

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <label className="f-mono" style={labelStyle}>League Name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="2026 Survivor Pool"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, color: name ? 'var(--ink)' : '#a99878' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label className="f-mono" style={labelStyle}>Season (Year)</label>
          <input
            name="season"
            type="number"
            required
            defaultValue={new Date().getFullYear()}
            min={2020}
            max={2099}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="f-mono" style={labelStyle}>Buy-in ($)</label>
          <input
            name="buyIn"
            type="number"
            required
            value={buyIn}
            min={1}
            step="0.01"
            onChange={(e) => setBuyIn(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="f-mono" style={labelStyle}>Venmo Handle</label>
        <input
          name="venmoHandle"
          type="text"
          required
          placeholder="@yourhandle"
          style={{ ...inputStyle, color: '#a99878' }}
          onFocus={(e) => (e.target.style.color = 'var(--ink)')}
          onBlur={(e) => { if (!e.target.value) e.target.style.color = '#a99878'; }}
        />
      </div>

      {error && (
        <p className="f-spectral" style={{ fontSize: '13px', color: 'var(--varsity-red)' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="f-oswald"
        style={{ background: 'var(--varsity-red)', color: '#f7f0dc', padding: '15px', textAlign: 'center', borderRadius: '3px', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '3px 3px 0 rgba(34,26,16,0.20)', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, width: '100%' }}
      >
        {isPending ? 'Creating…' : 'Create League →'}
      </button>
    </form>
  );
}
