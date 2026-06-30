'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WeekConfig } from '@/lib/schema';
import { setDeadline, openWeek, lockWeek, seedTestGames, backfillMissingPicks, clearPicksForWeek, completeLeague } from '@/app/actions/admin';

interface Props {
  leagueId: string;
  currentConfig: WeekConfig | null;
  allConfigs: WeekConfig[];
  selectedWeek: number;
}

function toLocalDatetime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const btnSmall = (color: string, border: string, bg = 'transparent'): React.CSSProperties => ({
  fontFamily: 'var(--font-oswald-var), sans-serif',
  fontWeight: 600,
  fontSize: '12px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color,
  border: `1.5px solid ${border}`,
  borderRadius: '4px',
  padding: '9px 10px',
  background: bg,
  cursor: 'pointer',
  flex: 1,
  textAlign: 'center' as const,
});

export function AdminWeekControls({ leagueId, currentConfig, allConfigs, selectedWeek }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [week, setWeek] = useState(selectedWeek);
  const [deadline, setDeadlineInput] = useState(() =>
    currentConfig?.deadline ? toLocalDatetime(new Date(currentConfig.deadline)) : ''
  );

  const configuredWeeks = new Set(allConfigs.map((c) => c.week));

  function handleWeekChange(newWeek: number) {
    setWeek(newWeek);
    router.replace(`/admin?league=${leagueId}&week=${newWeek}`);
  }

  function handleSetDeadline() {
    if (!deadline) return;
    startTransition(async () => { await setDeadline(leagueId, week, new Date(deadline)); });
  }

  function handleOpenWeek() {
    startTransition(async () => { await openWeek(leagueId, week); });
  }

  function handleLockWeek() {
    startTransition(async () => { await lockWeek(leagueId, week); });
  }

  function handleSeedTestGames() {
    startTransition(async () => { await seedTestGames(leagueId, week); });
  }

  function handleBackfill() {
    startTransition(async () => { await backfillMissingPicks(leagueId); });
  }

  function handleClearPicks() {
    if (!confirm(`Clear all picks for Week ${week}? This cannot be undone.`)) return;
    startTransition(async () => { await clearPicksForWeek(leagueId, week); });
  }

  function handleCompleteLeague() {
    if (!confirm('Complete this league? It will be archived and moved off the active dashboard and standings. You can then download its Hall of Fame CSV from the Admin archive.')) return;
    startTransition(async () => { await completeLeague(leagueId); });
  }

  const weekStatus = currentConfig
    ? currentConfig.isLocked ? 'locked' : currentConfig.isOpen ? 'open' : 'closed'
    : null;

  return (
    <div
      className="ticket-card"
      style={{ padding: '15px', boxShadow: '6px 6px 0 rgba(34,26,16,0.13)' }}
    >
      {/* Week + Deadline row */}
      <div style={{ display: 'flex', gap: '9px' }}>
        <div style={{ flex: 1 }}>
          <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--mono-muted)', marginBottom: '4px' }}>WEEK</div>
          <select
            value={week}
            onChange={(e) => handleWeekChange(Number(e.target.value))}
            className="f-oswald"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '40px',
              width: '100%',
              border: '1.5px solid var(--ink)',
              borderRadius: '4px',
              padding: '0 10px',
              fontWeight: 600,
              fontSize: '14px',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              background: 'white',
              appearance: 'none',
            }}
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}{configuredWeeks.has(w) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div className="f-mono" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--mono-muted)', marginBottom: '4px' }}>DEADLINE</div>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="f-mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '40px',
              width: '100%',
              border: '1.5px solid var(--ink)',
              borderRadius: '4px',
              padding: '0 10px',
              fontSize: '11px',
              color: 'var(--ink)',
              background: 'white',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Set deadline button */}
      <button
        onClick={handleSetDeadline}
        disabled={isPending || !deadline}
        className="f-oswald"
        style={{
          marginTop: '10px',
          display: 'block',
          width: '100%',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '12.5px',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: '#FBF5E6',
          background: isPending || !deadline ? 'var(--mono-muted)' : 'var(--ink)',
          borderRadius: '4px',
          padding: '10px',
          border: 'none',
          cursor: isPending || !deadline ? 'not-allowed' : 'pointer',
        }}
      >
        Set Deadline
      </button>

      {/* Divider */}
      <div style={{ height: '1.5px', background: 'var(--hairline)', margin: '14px 0' }} />

      {/* Utility buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <button
            onClick={handleSeedTestGames}
            disabled={isPending}
            className="f-oswald"
            style={{ fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#6b4a8a', border: '1.5px solid #b79ed1', borderRadius: '4px', padding: '7px 11px', background: 'transparent', cursor: 'pointer' }}
          >
            Load Test Games
          </button>
          <span className="f-spectral" style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--mono-muted)' }}>seeds 4 fake matchups</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <button
            onClick={handleBackfill}
            disabled={isPending}
            className="f-oswald"
            style={{ fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9a6a1d', border: '1.5px solid #d8b873', borderRadius: '4px', padding: '7px 11px', background: 'transparent', cursor: 'pointer' }}
          >
            Backfill Picks
          </button>
          <span className="f-spectral" style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--mono-muted)' }}>auto-assigns locked weeks</span>
        </div>
      </div>

      {/* Divider */}
      {currentConfig && (
        <>
          <div style={{ height: '1.5px', background: 'var(--hairline)', margin: '14px 0' }} />
          <p className="f-spectral" style={{ fontSize: '13px', color: '#3a2e1c', marginBottom: '9px' }}>
            Week {currentConfig.week} is{' '}
            <strong style={{ color: weekStatus === 'open' ? 'var(--field-green)' : weekStatus === 'locked' ? 'var(--varsity-red)' : 'var(--mono-muted)' }}>
              {weekStatus}
            </strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={handleOpenWeek}
              disabled={isPending || (currentConfig.isOpen && !currentConfig.isLocked)}
              style={btnSmall('var(--field-green)', '#a9bb9f')}
            >
              Open Picks
            </button>
            <button
              onClick={handleLockWeek}
              disabled={isPending || currentConfig.isLocked}
              style={btnSmall('var(--ink)', 'var(--ink)')}
            >
              Lock Picks
            </button>
            <button
              onClick={handleClearPicks}
              disabled={isPending}
              style={{ ...btnSmall('var(--varsity-red)', '#d99b96'), gridColumn: '1 / -1' }}
            >
              Clear Picks
            </button>
          </div>
        </>
      )}

      {/* League-level action */}
      <div style={{ height: '1.5px', background: 'var(--hairline)', margin: '14px 0' }} />
      <button
        onClick={handleCompleteLeague}
        disabled={isPending}
        className="f-oswald"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '12.5px',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: '#FBF5E6',
          background: 'var(--varsity-red)',
          border: 'none',
          borderRadius: '4px',
          padding: '10px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        Complete League
      </button>
    </div>
  );
}
