'use client';

import { useState } from 'react';
import type { Game } from '@/lib/schema';
import { getTeamColor, getTeamCity } from '@/lib/team-colors';

interface GameCardProps {
  game: Game;
  selected: string | null;
  usedTeams: string[];
  onSelect: (team: string) => void;
  locked?: boolean;
  records?: Record<string, string>;
}

export function GameCard({ game, selected, usedTeams, onSelect, locked = false, records = {} }: GameCardProps) {
  const teams = [
    { name: game.awayTeam, isHome: false },
    { name: game.homeTeam, isHome: true },
  ];

  const startLabel = new Date(game.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div
      className="ticket-card"
      style={{ boxShadow: '5px 5px 0 rgba(34,26,16,0.12)' }}
    >
      {/* Kickoff time stub header */}
      <div
        className="f-mono"
        suppressHydrationWarning
        style={{
          textAlign: 'center',
          fontSize: '10px',
          letterSpacing: '1.5px',
          color: 'var(--mono-muted)',
          padding: '7px',
          background: 'var(--paper-stub)',
          borderBottom: '1.5px dashed var(--hairline-dash)',
        }}
      >
        {startLabel}
      </div>

      {/* Team buttons */}
      <TeamButtons teams={teams} records={records} selected={selected} usedTeams={usedTeams} locked={locked} onSelect={onSelect} />
    </div>
  );
}

function TeamButtons({ teams, records, selected, usedTeams, locked, onSelect }: {
  teams: { name: string; isHome: boolean }[];
  records: Record<string, string>;
  selected: string | null;
  usedTeams: string[];
  locked: boolean;
  onSelect: (team: string) => void;
}) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const anySelectedInGame = selected !== null && teams.some((t) => t.name === selected);

  return (
    <div style={{ display: 'flex' }}>
      {teams.map((team, i) => {
        const isUsed = usedTeams.includes(team.name);
        const isSelected = selected === team.name;
        const isDisabled = isUsed || locked;
        const isHovered = hoveredTeam === team.name && !isDisabled && !isSelected;
        const teamColor = getTeamColor(team.name);
        const isLast = i === teams.length - 1;

        const borderRight = !isLast
          ? anySelectedInGame
            ? '1.5px solid var(--ink)'
            : '1.5px solid var(--hairline)'
          : undefined;

        const record = records[team.name];
        const homeAwayLabel = team.isHome ? 'HOME' : 'AWAY';
        const subLabel = isUsed
          ? 'USED'
          : isSelected
          ? 'YOUR PICK TO LOSE'
          : record
          ? `${getTeamCity(team.name)} · ${homeAwayLabel} · ${record}`
          : `${getTeamCity(team.name)} · ${homeAwayLabel}`;

        return (
          <button
            key={team.name}
            onClick={() => !isDisabled && onSelect(team.name)}
            onMouseEnter={() => setHoveredTeam(team.name)}
            onMouseLeave={() => setHoveredTeam(null)}
            disabled={isDisabled}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '14px 13px',
              background: isSelected ? 'var(--varsity-red)' : isHovered ? 'rgba(34,26,16,0.06)' : 'transparent',
              borderRight,
              border: isSelected ? undefined : borderRight ? undefined : 'none',
              borderLeft: 'none',
              borderTop: 'none',
              borderBottom: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isUsed ? 0.5 : 1,
              transition: 'background 0.1s',
            }}
          >
            <span
              className="team-chip"
              style={{
                width: '15px',
                height: '15px',
                background: isUsed ? '#9A8A6C' : teamColor,
                boxShadow: isSelected ? 'inset 0 0 0 1.5px rgba(255,255,255,0.5)' : undefined,
              }}
            />
            <div>
              <div
                className="f-oswald"
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  color: isSelected ? '#FBF5E6' : isUsed ? 'var(--disabled-text)' : 'var(--ink)',
                  lineHeight: 1,
                  textDecoration: isUsed ? 'line-through' : 'none',
                }}
              >
                {team.name}
              </div>
              <div
                className="f-mono"
                style={{
                  fontSize: '8.5px',
                  letterSpacing: '1px',
                  marginTop: '2px',
                  color: isSelected ? 'var(--cream-on-red)' : 'var(--disabled-text)',
                }}
              >
                {subLabel}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
