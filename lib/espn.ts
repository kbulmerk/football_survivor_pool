const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
// site.api.espn.com is occasionally hit with a transient Akamai block; this
// undocumented sibling host serves the same scoreboard data and has stayed
// reachable when the primary host hasn't.
const ESPN_SCOREBOARD_FALLBACK_URL =
  'https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export interface ESPNGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string | null;
  awayRecord: string | null;
  startTime: Date;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  // Per-period points scored (index 0 = Q1, …). Empty until the game starts.
  homeLinescores: number[];
  awayLinescores: number[];
  // Current period number per ESPN (1-4, 5+ for OT) and completion flag.
  period: number;
  completed: boolean;
}

// ESPN season types. 2 = regular season, 3 = postseason (playoffs + Super Bowl).
export const SEASON_TYPE_REGULAR = 2;
export const SEASON_TYPE_POSTSEASON = 3;

/**
 * Selectable "rounds" for a squares pool, in chronological order. Regular-season
 * weeks 1-18 plus the postseason. ESPN files the postseason under seasontype=3
 * with its own week numbering; week 4 there is the Pro Bowl, which we skip.
 */
export const SQUARES_ROUNDS: { seasonType: number; week: number; label: string }[] = [
  ...Array.from({ length: 18 }, (_, i) => ({
    seasonType: SEASON_TYPE_REGULAR,
    week: i + 1,
    label: `Week ${i + 1}`,
  })),
  { seasonType: SEASON_TYPE_POSTSEASON, week: 1, label: 'Wild Card' },
  { seasonType: SEASON_TYPE_POSTSEASON, week: 2, label: 'Divisional' },
  { seasonType: SEASON_TYPE_POSTSEASON, week: 3, label: 'Conference Championship' },
  { seasonType: SEASON_TYPE_POSTSEASON, week: 5, label: 'Super Bowl' },
];

/** Human-readable label for a (seasonType, week) pair, e.g. "Super Bowl" or "Week 7". */
export function formatRound(seasonType: number, week: number): string {
  return (
    SQUARES_ROUNDS.find((r) => r.seasonType === seasonType && r.week === week)?.label ??
    `Week ${week}`
  );
}

export async function fetchESPNGames(
  week: number,
  season: number,
  seasonType: number = SEASON_TYPE_REGULAR
): Promise<ESPNGame[]> {
  const query = `?seasontype=${seasonType}&week=${week}&dates=${season}`;
  let res = await fetch(`${ESPN_SCOREBOARD_URL}${query}`);

  if (!res.ok) {
    console.warn(`ESPN API ${res.status} from site.api.espn.com — retrying against site.web.api.espn.com`);
    res = await fetch(`${ESPN_SCOREBOARD_FALLBACK_URL}${query}`);
  }

  if (!res.ok) {
    console.error(`ESPN API ${res.status} for week=${week} season=${season} seasontype=${seasonType}`);
    return [];
  }

  const data = await res.json();
  const events: unknown[] = data?.events ?? [];

  return events.flatMap((event: unknown) => {
    const e = event as Record<string, unknown>;
    const competition = (e.competitions as Record<string, unknown>[])?.[0];
    const competitors = (competition?.competitors as Record<string, unknown>[]) ?? [];

    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');

    const homeTeam = (home?.team as Record<string, string>)?.displayName ?? '';
    const awayTeam = (away?.team as Record<string, string>)?.displayName ?? '';
    if (!homeTeam || !awayTeam) return [];

    const homeRecord =
      (home?.records as Array<{ type: string; summary: string }> | undefined)
        ?.find((r) => r.type === 'total')?.summary ?? null;
    const awayRecord =
      (away?.records as Array<{ type: string; summary: string }> | undefined)
        ?.find((r) => r.type === 'total')?.summary ?? null;

    const homeScore = home?.score != null ? Number(home.score) : null;
    const awayScore = away?.score != null ? Number(away.score) : null;

    const statusObj = competition?.status as Record<string, unknown> | undefined;
    const status = statusObj?.type as Record<string, unknown> | undefined;
    const period = Number(statusObj?.period ?? 0);
    const completed = Boolean(status?.completed);

    let winner: string | null = null;
    if (completed && homeScore !== null && awayScore !== null) {
      winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
    }

    const toLinescores = (c: Record<string, unknown> | undefined): number[] =>
      ((c?.linescores as Array<{ value?: number }> | undefined) ?? []).map((l) =>
        Number(l?.value ?? 0)
      );

    return [{
      id: e.id as string,
      homeTeam,
      awayTeam,
      homeRecord,
      awayRecord,
      startTime: new Date(e.date as string),
      homeScore,
      awayScore,
      winner,
      homeLinescores: toLinescores(home),
      awayLinescores: toLinescores(away),
      period,
      completed,
    }];
  });
}

/**
 * Fetch a single ESPN game by its event id within a given week/season.
 * Returns null if the game isn't found.
 */
export async function fetchESPNGameById(
  espnGameId: string,
  week: number,
  season: number,
  seasonType: number = SEASON_TYPE_REGULAR
): Promise<ESPNGame | null> {
  const weekGames = await fetchESPNGames(week, season, seasonType);
  return weekGames.find((g) => g.id === espnGameId) ?? null;
}

/**
 * Cumulative score at the END of a given quarter (1-4) from per-period
 * linescores. Returns null if that quarter hasn't been played yet.
 *
 * ESPN `linescores[i].value` holds the points scored IN period i+1, so the
 * cumulative score is the sum of periods 1..quarter. For Q4 we include any
 * overtime periods so the final score is reflected.
 */
export function cumulativeScoresAtQuarter(
  homeLinescores: number[],
  awayLinescores: number[],
  quarter: number
): { home: number; away: number } | null {
  // Need at least `quarter` periods recorded on both sides to be meaningful.
  if (homeLinescores.length < quarter || awayLinescores.length < quarter) return null;
  // Q4 absorbs overtime so the "end of regulation/game" total is correct.
  const upTo = quarter >= 4 ? Math.max(homeLinescores.length, awayLinescores.length) : quarter;
  const sum = (arr: number[]) => arr.slice(0, upTo).reduce((a, b) => a + b, 0);
  return { home: sum(homeLinescores), away: sum(awayLinescores) };
}

/**
 * Resolve the winning grid cell (row/col positions 0-9) for a given cumulative
 * score, using the randomized digit headers and the row/col team orientation.
 * Returns null if a last digit isn't present in the headers (shouldn't happen
 * once the grid is locked with a full 0-9 shuffle).
 */
export function winningCell(
  homeScore: number,
  awayScore: number,
  rowDigits: number[],
  colDigits: number[],
  homeIsRows: boolean
): { row: number; col: number } | null {
  const homeLast = ((homeScore % 10) + 10) % 10;
  const awayLast = ((awayScore % 10) + 10) % 10;
  const rowDigit = homeIsRows ? homeLast : awayLast;
  const colDigit = homeIsRows ? awayLast : homeLast;
  const row = rowDigits.indexOf(rowDigit);
  const col = colDigits.indexOf(colDigit);
  if (row === -1 || col === -1) return null;
  return { row, col };
}
