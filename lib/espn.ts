// Phase 2: ESPN API integration for pulling weekly NFL schedules.
// ESPN's unofficial scoreboard endpoint returns game data in a consistent shape.

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export interface ESPNGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
}

export async function fetchESPNGames(week: number, season: number): Promise<ESPNGame[]> {
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=2&week=${week}&dates=${season}`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status}`);
  }

  const data = await res.json();
  const events: unknown[] = data?.events ?? [];

  return events.map((event: unknown) => {
    const e = event as Record<string, unknown>;
    const competitions = (e.competitions as Record<string, unknown>[])?.[0];
    const competitors = (competitions?.competitors as Record<string, unknown>[]) ?? [];

    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');

    const homeTeam = (home?.team as Record<string, string>)?.displayName ?? '';
    const awayTeam = (away?.team as Record<string, string>)?.displayName ?? '';

    const homeScore = home?.score != null ? Number(home.score) : null;
    const awayScore = away?.score != null ? Number(away.score) : null;

    let winner: string | null = null;
    const status = (competitions?.status as Record<string, unknown>)?.type as Record<string, unknown>;
    if (status?.completed) {
      if (homeScore !== null && awayScore !== null) {
        winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
      }
    }

    return {
      id: e.id as string,
      homeTeam,
      awayTeam,
      startTime: new Date(e.date as string),
      homeScore,
      awayScore,
      winner,
    };
  });
}
