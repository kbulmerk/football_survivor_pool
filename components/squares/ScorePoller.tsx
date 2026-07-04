'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSquaresScores } from '@/app/actions/squares';

const POLL_MS = 120_000; // every 2 minutes while the game is live

/**
 * Drives live scoring entirely from the web app — no cron. While the tracked
 * game is in progress (and not all quarters recorded), it periodically asks the
 * server to pull ESPN and record completed quarters, then refreshes the page.
 */
export function ScorePoller({
  leagueId,
  startTime,
  allQuartersRecorded,
}: {
  leagueId: string;
  startTime: string;
  allQuartersRecorded: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (allQuartersRecorded) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let startTimeout: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        await refreshSquaresScores(leagueId);
        router.refresh();
      } catch {
        // Network/transient errors are fine — we'll try again next tick.
      }
    };

    const begin = () => {
      void poll();
      interval = setInterval(poll, POLL_MS);
    };

    const msUntilStart = new Date(startTime).getTime() - Date.now();
    if (msUntilStart <= 0) {
      begin();
    } else {
      // Idle until kickoff, then start polling.
      startTimeout = setTimeout(begin, msUntilStart);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (startTimeout) clearTimeout(startTimeout);
    };
  }, [leagueId, startTime, allQuartersRecorded, router]);

  if (allQuartersRecorded) return null;

  return (
    <p
      className="f-mono"
      style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--mono-muted)', marginTop: '8px' }}
    >
      ● LIVE SCORING — scores update automatically while this page is open
    </p>
  );
}
