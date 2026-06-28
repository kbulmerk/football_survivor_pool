import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { games, leagues, weekConfig } from '@/lib/schema';
import { evaluateResults } from '@/lib/survivor-rules';
import { fetchESPNGames } from '@/lib/espn';

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[tuesday-open] Starting weekly cron job');

  const allLeagues = await db.select().from(leagues).where(eq(leagues.status, 'active'));
  console.log(`[tuesday-open] Found ${allLeagues.length} active league(s)`);

  for (const league of allLeagues) {
    // ── Step 1: Pull scores, update games, evaluate the locked week ──────────

    const [lockedConfig] = await db
      .select()
      .from(weekConfig)
      .where(
        and(
          eq(weekConfig.leagueId, league.id),
          eq(weekConfig.isLocked, true),
          eq(weekConfig.isEvaluated, false)
        )
      )
      .orderBy(weekConfig.week)
      .limit(1);

    if (lockedConfig) {
      console.log(`[tuesday-open] League "${league.name}" — fetching ESPN scores for Week ${lockedConfig.week} (${league.season})`);
      const espnGames = await fetchESPNGames(lockedConfig.week, league.season);

      // Build a lookup map by team name (both sides) for O(1) access
      const byTeam = new Map(espnGames.flatMap((g) => [[g.homeTeam, g], [g.awayTeam, g]]));
      console.log(`[tuesday-open] League "${league.name}" — ${espnGames.filter((g) => g.winner).length} completed game(s) from ESPN`);

      const weekGames = await db
        .select()
        .from(games)
        .where(and(eq(games.leagueId, league.id), eq(games.week, lockedConfig.week)));

      let updated = 0;
      for (const game of weekGames) {
        if (game.winner !== null) continue;
        const espn = byTeam.get(game.homeTeam) ?? byTeam.get(game.awayTeam);
        if (!espn?.winner) {
          console.log(`[tuesday-open] No completed ESPN result for ${game.homeTeam} vs ${game.awayTeam}`);
          continue;
        }
        await db
          .update(games)
          .set({ homeScore: espn.homeScore, awayScore: espn.awayScore, winner: espn.winner })
          .where(eq(games.id, game.id));
        updated++;
      }
      console.log(`[tuesday-open] League "${league.name}" Week ${lockedConfig.week} — updated ${updated} game(s)`);

      await evaluateResults(league.id, lockedConfig.week);
      await db.update(weekConfig).set({ isEvaluated: true }).where(eq(weekConfig.id, lockedConfig.id));
      console.log(`[tuesday-open] League "${league.name}" Week ${lockedConfig.week} — evaluation complete`);
    } else {
      console.log(`[tuesday-open] League "${league.name}" — no locked/unevaluated week to process`);
    }

    // ── Step 2: Refresh schedule + open the next week ────────────────────────

    const [nextConfig] = await db
      .select()
      .from(weekConfig)
      .where(
        and(
          eq(weekConfig.leagueId, league.id),
          eq(weekConfig.isOpen, false),
          eq(weekConfig.isLocked, false)
        )
      )
      .orderBy(weekConfig.week)
      .limit(1);

    if (nextConfig) {
      console.log(`[tuesday-open] League "${league.name}" — refreshing schedule for Week ${nextConfig.week}`);
      const espnGames = await fetchESPNGames(nextConfig.week, league.season);

      let refreshed = 0;
      for (const espn of espnGames) {
        const [existing] = await db
          .select()
          .from(games)
          .where(
            and(
              eq(games.leagueId, league.id),
              eq(games.week, nextConfig.week),
              eq(games.homeTeam, espn.homeTeam),
              eq(games.awayTeam, espn.awayTeam)
            )
          );

        if (existing) {
          await db
            .update(games)
            .set({ startTime: espn.startTime })
            .where(eq(games.id, existing.id));
        } else {
          // Fallback: game wasn't seeded at league creation — insert it now
          await db.insert(games).values({
            leagueId: league.id,
            week: nextConfig.week,
            homeTeam: espn.homeTeam,
            awayTeam: espn.awayTeam,
            startTime: espn.startTime,
          });
        }
        refreshed++;
      }
      console.log(`[tuesday-open] League "${league.name}" Week ${nextConfig.week} — refreshed ${refreshed} game(s)`);

      await db.update(weekConfig).set({ isOpen: true }).where(eq(weekConfig.id, nextConfig.id));
      console.log(`[tuesday-open] League "${league.name}" — opened Week ${nextConfig.week}`);
    } else {
      console.log(`[tuesday-open] League "${league.name}" — no week ready to open`);
    }
  }

  console.log('[tuesday-open] Weekly cron job complete');
  return NextResponse.json({ ok: true });
}
