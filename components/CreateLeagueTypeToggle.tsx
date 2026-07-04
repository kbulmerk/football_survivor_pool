'use client';

import { useState } from 'react';
import { CreateLeagueForm } from '@/components/CreateLeagueForm';
import { CreateSquaresLeagueForm } from '@/components/CreateSquaresLeagueForm';

export function CreateLeagueTypeToggle() {
  const [gameType, setGameType] = useState<'survivor' | 'squares'>('survivor');
  const isSquares = gameType === 'squares';

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Form card */}
      <div style={{ background: 'var(--paper-card)', border: '1.5px solid var(--ink)', borderRadius: '5px', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(34,26,16,0.10)' }}>

        {/* Card header */}
        <div style={{ background: '#201810', padding: '13px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="f-mono" style={{ fontSize: '11px', letterSpacing: '2px', color: '#f2e8cf' }}>NEW LEAGUE</span>
          <span className="f-mono" style={{ fontSize: '11px', letterSpacing: '2px', color: '#c6a24a' }}>
            {isSquares ? 'SQUARES' : 'SURVIVOR'}
          </span>
        </div>

        <div style={{ padding: '24px 22px 28px' }}>
          {/* Pool type segmented toggle */}
          <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '8px' }}>POOL TYPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid var(--ink)', borderRadius: '3px', overflow: 'hidden', marginBottom: '22px' }}>
            <button
              type="button"
              onClick={() => setGameType('survivor')}
              className="f-oswald"
              style={{ background: !isSquares ? 'var(--varsity-red)' : 'transparent', color: !isSquares ? '#f7f0dc' : 'var(--ink)', padding: '12px', textAlign: 'center', cursor: 'pointer', border: 'none', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
            >
              Survivor Pool
            </button>
            <button
              type="button"
              onClick={() => setGameType('squares')}
              className="f-oswald"
              style={{ background: isSquares ? 'var(--varsity-red)' : 'transparent', color: isSquares ? '#f7f0dc' : 'var(--ink)', padding: '12px', textAlign: 'center', cursor: 'pointer', border: 'none', borderLeft: '1.5px solid var(--ink)', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
            >
              Squares
            </button>
          </div>

          {gameType === 'survivor' ? <CreateLeagueForm /> : <CreateSquaresLeagueForm />}
        </div>
      </div>
    </div>
  );
}
