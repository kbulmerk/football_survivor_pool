'use client';

import { useRouter } from 'next/navigation';
import type { SeasonFile } from '@/lib/hall-of-fame';

interface Props {
  seasons: SeasonFile[];
  selected: string;
}

export function HallOfFameSelector({ seasons, selected }: Props) {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 13px',
        background: 'var(--paper-card)',
        border: '1.5px solid var(--ink)',
        borderRadius: '5px',
      }}
    >
      <div>
        <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--mono-muted)' }}>SEASON</div>
        <div className="f-oswald" style={{ fontWeight: 600, fontSize: '15px', textTransform: 'uppercase', color: 'var(--ink)', marginTop: '1px' }}>
          {seasons.find((s) => s.file === selected)?.label ?? 'Select a season'}
        </div>
      </div>
      <span className="f-mono" style={{ fontSize: '18px', color: 'var(--ink)', pointerEvents: 'none' }}>▾</span>
      <select
        value={selected}
        onChange={(e) => router.replace(`/hall-of-fame?season=${encodeURIComponent(e.target.value)}`)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        {seasons.map((s) => (
          <option key={s.file} value={s.file}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
