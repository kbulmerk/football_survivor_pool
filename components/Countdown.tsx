'use client';

import { useEffect, useState } from 'react';

type Variant = 'default' | 'compact' | 'inline';

function formatRemaining(ms: number, variant: Variant): string {
  if (ms <= 0) return variant === 'compact' ? 'Locked' : 'Picks locked';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (variant === 'compact') {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  if (variant === 'inline') {
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m ${seconds}s left`;
  }

  // default
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
}

interface Props {
  deadline: string;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
}

export function Countdown({ deadline, variant = 'default', className, style }: Props) {
  const [remaining, setRemaining] = useState(new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const isLocked = remaining <= 0;
  const isUrgent = !isLocked && remaining < 3600000;

  const defaultColor = isLocked ? 'var(--varsity-red)' : isUrgent ? '#C08A2E' : undefined;

  return (
    <span className={className} style={{ color: defaultColor, ...style }}>
      {formatRemaining(remaining, variant)}
    </span>
  );
}
