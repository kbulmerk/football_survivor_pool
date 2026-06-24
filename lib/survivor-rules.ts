import { and, eq, ne } from 'drizzle-orm';
import { db } from './db';
import { games, leagueMembers, picks, weekConfig } from './schema';

export async function autoAssignMissingPicksForWeek(
  leagueId: string,
  week: number
): Promise<void> {
  const members = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.isPaid, true)));

  const weekGames = await db
    .select()
    .from(games)
    .where(
      and(eq(games.leagueId, leagueId), eq(games.week, week), eq(games.isExcluded, false))
    );

  const allTeams = weekGames.flatMap((g) => [g.homeTeam, g.awayTeam]);
  if (allTeams.length === 0) return;

  for (const { userId } of members) {
    const [existing] = await db
      .select()
      .from(picks)
      .where(and(eq(picks.leagueId, leagueId), eq(picks.userId, userId), eq(picks.week, week)));

    if (existing) continue;

    const usedPicks = await db
      .select({ teamPicked: picks.teamPicked })
      .from(picks)
      .where(
        and(eq(picks.leagueId, leagueId), eq(picks.userId, userId), ne(picks.week, week))
      );

    const usedTeams = new Set(usedPicks.map((p) => p.teamPicked));
    const available = allTeams.filter((t) => !usedTeams.has(t));
    if (available.length === 0) continue;

    const randomTeam = available[Math.floor(Math.random() * available.length)];

    await db
      .insert(picks)
      .values({ leagueId, userId, week, teamPicked: randomTeam })
      .onConflictDoNothing();
  }
}

export async function autoAssignOnDeadlinePass(
  leagueId: string,
  week: number
): Promise<void> {
  await autoAssignMissingPicksForWeek(leagueId, week);
  await db
    .update(weekConfig)
    .set({ isLocked: true })
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));
}

export type PickValidationError =
  | 'NOT_IN_LEAGUE'
  | 'NOT_PAID'
  | 'WEEK_NOT_OPEN'
  | 'WEEK_LOCKED'
  | 'TEAM_ALREADY_USED'
  | 'TEAM_IN_EXCLUDED_GAME'
  | 'TEAM_NOT_PLAYING';

export async function validatePick(
  userId: string,
  leagueId: string,
  week: number,
  team: string
): Promise<PickValidationError | null> {
  // 1. Must be a paid member
  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.leagueId, leagueId)));

  if (!member) return 'NOT_IN_LEAGUE';
  if (!member.isPaid) return 'NOT_PAID';

  // 2. Week must be open and not locked
  const [config] = await db
    .select()
    .from(weekConfig)
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  if (!config || !config.isOpen) return 'WEEK_NOT_OPEN';
  if (config.isLocked || new Date() > config.deadline) return 'WEEK_LOCKED';

  // 3. Team must not have been used by this user in a previous week
  const priorPick = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.leagueId, leagueId),
        eq(picks.userId, userId),
        eq(picks.teamPicked, team),
        ne(picks.week, week)
      )
    );

  if (priorPick.length > 0) return 'TEAM_ALREADY_USED';

  // 4. Team must not be in an excluded game
  const thisWeekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, leagueId), eq(games.week, week)));

  const teamGame = thisWeekGames.find(
    (g) => g.homeTeam === team || g.awayTeam === team
  );

  if (!teamGame) return 'TEAM_NOT_PLAYING';
  if (teamGame.isExcluded) return 'TEAM_IN_EXCLUDED_GAME';

  return null;
}

export async function evaluateResults(leagueId: string, week: number): Promise<void> {
  const weekPicks = await db
    .select()
    .from(picks)
    .where(and(eq(picks.leagueId, leagueId), eq(picks.week, week)));

  const weekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, leagueId), eq(games.week, week)));

  for (const pick of weekPicks) {
    const game = weekGames.find(
      (g) => g.homeTeam === pick.teamPicked || g.awayTeam === pick.teamPicked
    );

    // Skip if game hasn't resolved yet
    if (!game || game.winner === null) continue;

    const pickedTeamWon = game.winner === pick.teamPicked;

    if (pickedTeamWon) {
      // User picked a team to lose but it won — eliminated
      await db
        .update(picks)
        .set({ result: 'eliminated' })
        .where(eq(picks.id, pick.id));

      await db
        .update(leagueMembers)
        .set({ isAlive: false, eliminatedWeek: week })
        .where(
          and(
            eq(leagueMembers.leagueId, leagueId),
            eq(leagueMembers.userId, pick.userId)
          )
        );
    } else {
      // Team lost as predicted — correct pick
      await db
        .update(picks)
        .set({ result: 'correct' })
        .where(eq(picks.id, pick.id));
    }
  }
}
