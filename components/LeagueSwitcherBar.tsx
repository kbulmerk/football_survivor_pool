'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { League } from '@/lib/schema';

interface Props {
  league: League;
  leagues: League[];
  targetPath: string;
}

export function LeagueSwitcherBar({ league, leagues, targetPath }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setOpen(false);
    router.push(`${targetPath}?leagueId=${id}`);
  };

  const canSwitch = leagues.length > 1;

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 13px',
          background: 'var(--paper-card)',
          border: '1.5px solid var(--ink)',
          borderRadius: open ? '5px 5px 0 0' : '5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <span
            className="f-mono"
            style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--mono-muted)' }}
          >
            LEAGUE
          </span>
          <span
            className="f-oswald"
            style={{ fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', color: 'var(--ink)' }}
          >
            {league.name}
          </span>
        </div>
        {canSwitch && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="f-oswald"
            style={{
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--varsity-red)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Switch {open ? '▴' : '▾'}
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--paper-card)',
            border: '1.5px solid var(--ink)',
            borderTop: 'none',
            borderRadius: '0 0 5px 5px',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {leagues.map((l, i) => (
            <button
              key={l.id}
              onClick={() => handleSelect(l.id)}
              className="f-oswald"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 13px',
                background: l.id === league.id ? 'rgba(34,26,16,0.06)' : 'none',
                border: 'none',
                borderTop: i > 0 ? `1px solid var(--hairline)` : 'none',
                cursor: 'pointer',
                fontWeight: l.id === league.id ? 700 : 600,
                fontSize: '13px',
                textTransform: 'uppercase',
                color: l.id === league.id ? 'var(--varsity-red)' : 'var(--ink)',
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
