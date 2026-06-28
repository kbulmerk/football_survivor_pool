const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

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
}

export async function fetchESPNGames(week: number, season: number): Promise<ESPNGame[]> {
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=2&week=${week}&season=${season}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`ESPN API ${res.status} for week=${week} season=${season}`);
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

    let winner: string | null = null;
    const status = (competition?.status as Record<string, unknown>)?.type as Record<string, unknown>;
    if (status?.completed && homeScore !== null && awayScore !== null) {
      winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
    }

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
    }];
  });
}
