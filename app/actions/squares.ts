'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  leagueMembers,
  quarterResults,
  squareAssignments,
  squaresConfig,
} from '@/lib/schema';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import {
  cumulativeScoresAtQuarter,
  fetchESPNGameById,
  winningCell,
} from '@/lib/espn';

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Closes signups so no new players can join. Must be done before generating the grid. */
export async function lockSignup(
  leagueId: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const [config] = await db
    .select()
    .from(squaresConfig)
    .where(eq(squaresConfig.leagueId, leagueId));
  if (!config) return { error: 'Squares pool not found.' };
  if (config.signupLocked) return { error: 'Signups are already locked.' };

  await db
    .update(squaresConfig)
    .set({ signupLocked: true, signupLockedAt: new Date() })
    .where(eq(squaresConfig.leagueId, leagueId));

  revalidatePath('/squares');
  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Generates the grid after signups are locked:
 *  - randomly distributes all 100 squares among members (floor(100/n) each,
 *    remainder randomly handed out),
 *  - randomly picks which team labels the rows,
 *  - randomly assigns the 0-9 digit headers.
 * Guarded so it can only run once.
 */
export async function generateGrid(
  leagueId: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const [config] = await db
    .select()
    .from(squaresConfig)
    .where(eq(squaresConfig.leagueId, leagueId));
  if (!config) return { error: 'Squares pool not found.' };
  if (!config.signupLocked) return { error: 'Lock signups before generating the grid.' };
  if (config.isLocked) return { error: 'Grid has already been generated.' };

  const members = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  if (members.length === 0) return { error: 'No members have joined yet.' };

  // All 100 grid cells, shuffled, then dealt round-robin to a shuffled member
  // list so the "extra" squares (the remainder) land on random members.
  const cells = shuffle(
    Array.from({ length: 100 }, (_, i) => ({ row: Math.floor(i / 10), col: i % 10 }))
  );
  const memberIds = shuffle(members.map((m) => m.userId));

  const rows = cells.map((cell, i) => ({
    leagueId,
    userId: memberIds[i % memberIds.length],
    row: cell.row,
    col: cell.col,
  }));

  await db.insert(squareAssignments).values(rows);

  const rowDigits = shuffle(Array.from({ length: 10 }, (_, i) => i));
  const colDigits = shuffle(Array.from({ length: 10 }, (_, i) => i));

  await db
    .update(squaresConfig)
    .set({
      isLocked: true,
      lockedAt: new Date(),
      homeIsRows: Math.random() < 0.5,
      rowDigits: JSON.stringify(rowDigits),
      colDigits: JSON.stringify(colDigits),
    })
    .where(eq(squaresConfig.leagueId, leagueId));

  revalidatePath('/squares');
  revalidatePath('/admin');
  return { ok: true };
}

async function resolveWinner(
  leagueId: string,
  row: number,
  col: number
): Promise<string | null> {
  const [owner] = await db
    .select({ userId: squareAssignments.userId })
    .from(squareAssignments)
    .where(
      and(
        eq(squareAssignments.leagueId, leagueId),
        eq(squareAssignments.row, row),
        eq(squareAssignments.col, col)
      )
    );
  return owner?.userId ?? null;
}

/**
 * Polls ESPN for the tracked game and records any newly-completed quarters.
 * Idempotent: existing quarter rows (including manual overrides) are left
 * untouched. Invoked from the pool page on an interval while the game is live.
 */
export async function refreshSquaresScores(
  leagueId: string
): Promise<{ ok: true } | { error: string }> {
  await getCurrentUser();

  const [config] = await db
    .select()
    .from(squaresConfig)
    .where(eq(squaresConfig.leagueId, leagueId));
  if (!config) return { error: 'Squares pool not found.' };
  if (!config.isLocked || !config.rowDigits || !config.colDigits) {
    return { error: 'Grid is not locked yet.' };
  }
  if (new Date() < config.startTime) return { ok: true }; // not started

  const existing = await db
    .select({ quarter: quarterResults.quarter })
    .from(quarterResults)
    .where(eq(quarterResults.leagueId, leagueId));
  const recorded = new Set(existing.map((r) => r.quarter));
  if (recorded.size >= 4) return { ok: true };

  const game = await fetchESPNGameById(config.espnGameId, config.week, config.season, config.seasonType);
  if (!game) return { error: 'Game not found on ESPN.' };

  const rowDigits = JSON.parse(config.rowDigits) as number[];
  const colDigits = JSON.parse(config.colDigits) as number[];

  for (let q = 1; q <= 4; q++) {
    if (recorded.has(q)) continue;
    const quarterComplete = game.period > q || (q === 4 && game.completed);
    if (!quarterComplete) continue;

    const scores = cumulativeScoresAtQuarter(
      game.homeLinescores,
      game.awayLinescores,
      q
    );
    if (!scores) continue;

    const cell = winningCell(scores.home, scores.away, rowDigits, colDigits, config.homeIsRows!);
    const winnerUserId = cell ? await resolveWinner(leagueId, cell.row, cell.col) : null;

    await db
      .insert(quarterResults)
      .values({
        leagueId,
        quarter: q,
        homeScore: scores.home,
        awayScore: scores.away,
        winningRow: cell?.row ?? null,
        winningCol: cell?.col ?? null,
        winnerUserId,
        source: 'auto',
      })
      .onConflictDoNothing({
        target: [quarterResults.leagueId, quarterResults.quarter],
      });
  }

  revalidatePath('/squares');
  return { ok: true };
}

/**
 * Admin manual override for a quarter's cumulative score. Upserts, marking the
 * row as `manual` so the auto poll won't clobber it.
 */
export async function setQuarterScore(
  leagueId: string,
  quarter: number,
  homeScore: number,
  awayScore: number
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const [config] = await db
    .select()
    .from(squaresConfig)
    .where(eq(squaresConfig.leagueId, leagueId));
  if (!config) return { error: 'Squares pool not found.' };
  if (!config.isLocked || !config.rowDigits || !config.colDigits) {
    return { error: 'Lock and generate the grid before entering scores.' };
  }
  if (quarter < 1 || quarter > 4) return { error: 'Quarter must be 1-4.' };

  const rowDigits = JSON.parse(config.rowDigits) as number[];
  const colDigits = JSON.parse(config.colDigits) as number[];
  const cell = winningCell(homeScore, awayScore, rowDigits, colDigits, config.homeIsRows!);
  const winnerUserId = cell ? await resolveWinner(leagueId, cell.row, cell.col) : null;

  await db
    .insert(quarterResults)
    .values({
      leagueId,
      quarter,
      homeScore,
      awayScore,
      winningRow: cell?.row ?? null,
      winningCol: cell?.col ?? null,
      winnerUserId,
      source: 'manual',
    })
    .onConflictDoUpdate({
      target: [quarterResults.leagueId, quarterResults.quarter],
      set: {
        homeScore,
        awayScore,
        winningRow: cell?.row ?? null,
        winningCol: cell?.col ?? null,
        winnerUserId,
        source: 'manual',
        recordedAt: new Date(),
      },
    });

  revalidatePath('/squares');
  return { ok: true };
}
