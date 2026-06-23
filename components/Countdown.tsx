'use client';

import { useEffect, useState } from 'react';

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Picks locked';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
}

export function Countdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(
    new Date(deadline).getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const isUrgent = remaining > 0 && remaining < 3600000; // < 1 hour

  return (
    <span
      className={`text-sm font-medium ${
        remaining <= 0
          ? 'text-red-600'
          : isUrgent
          ? 'text-orange-500'
          : 'text-gray-500'
      }`}
    >
      {formatRemaining(remaining)}
    </span>
  );
}
