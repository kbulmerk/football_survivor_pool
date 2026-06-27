'use client';

import { useState, useTransition } from 'react';
import type { Game } from '@/lib/schema';
import { GameCard } from './GameCard';
import { submitPick } from '@/app/actions/pick';
import { Countdown } from './Countdown';

interface PickFormProps {
  leagueId: string;
  week: number;
  games: Game[];
  usedTeams: string[];
  currentPick: string | null;
  deadline: string;
  locked?: boolean;
}

export function PickForm({
  leagueId,
  week,
  games,
  usedTeams,
  currentPick,
  deadline,
  locked = false,
}: PickFormProps) {
  const [selected, setSelected] = useState<string | null>(currentPick);
  const [savedPick, setSavedPick] = useState<string | null>(currentPick);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selected) return;
    setMessage(null);

    startTransition(async () => {
      const result = await submitPick(leagueId, week, selected);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setSavedPick(selected);
        setMessage({ type: 'success', text: `Pick saved: ${selected} to lose.` });
      }
    });
  }

  return (
    <div style={{ marginTop: '13px' }}>
      {/* Dark deadline bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 13px', background: 'var(--ink)', borderRadius: '6px', marginBottom: '14px' }}>
        <span className="f-oswald" style={{ fontWeight: 600, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
          Deadline
        </span>
        <Countdown
          deadline={deadline}
          variant="inline"
          className="f-mono"
          style={{ fontWeight: 700, fontSize: '15px', color: '#ECE0C4' }}
        />
      </div>

      {/* Game cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            selected={selected}
            usedTeams={usedTeams}
            onSelect={setSelected}
            locked={locked}
          />
        ))}
      </div>

      {/* Feedback message */}
      {message && (
        <div
          style={{
            padding: '11px 14px',
            marginBottom: '12px',
            borderRadius: '4px',
            background: message.type === 'success' ? '#E0E8D6' : '#F4DADA',
            color: message.type === 'success' ? 'var(--field-green)' : 'var(--varsity-red)',
            fontSize: '13px',
            fontFamily: 'var(--font-spectral-var), serif',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Submit button */}
      {!locked && (
        <button
          onClick={handleSubmit}
          disabled={!selected || isPending || selected === savedPick}
          className="f-oswald"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#FBF5E6',
            background: !selected || selected === savedPick ? 'var(--disabled-border)' : 'var(--varsity-red)',
            borderRadius: '5px',
            padding: '14px',
            border: 'none',
            boxShadow: !selected || selected === savedPick ? 'none' : '4px 4px 0 rgba(34,26,16,0.18)',
            cursor: !selected || isPending || selected === savedPick ? 'not-allowed' : 'pointer',
            transition: 'filter 0.1s',
          }}
        >
          {isPending
            ? 'Saving…'
            : selected && selected !== savedPick
            ? `Lock In: ${selected} to Lose →`
            : savedPick
            ? `Locked: ${savedPick} to Lose`
            : 'Select a team'}
        </button>
      )}

      {locked && (
        <div
          className="f-oswald"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '13px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--disabled-text)',
            border: '1.5px dashed var(--disabled-border)',
            borderRadius: '5px',
            padding: '14px',
          }}
        >
          {currentPick ? `Pick locked: ${currentPick} to lose` : 'Picks are locked'}
        </div>
      )}
    </div>
  );
}
