#!/usr/bin/env node

/**
 * tuesday-open.js — Weekly week-opening job
 *
 * For every active league, opens the next pick week — auto-creating its
 * config if needed, with a deadline of the following Saturday 11:59pm ET —
 * and refreshes that week's schedule from ESPN.
 *
 * Eliminations and league-completion are handled separately by
 * check-results.js as each game slate finishes; this script only opens the
 * next week, it doesn't evaluate the one that just locked.
 *
 * Talks directly to the Raspberry Pi's Postgres container — no more HTTP
 * call to a Next.js route. Meant to run inside the same Docker network as
 * the `db` container, with CRON_DATABASE_URL passed in via docker-compose
 * (so the "db" hostname resolves), scheduled for Tuesday morning ET, e.g.
 * via the Pi's host crontab:
 *   0 9 * * 2  docker compose run --rm tuesday-open
 */

const { Client } = require('pg');
const https = require('https');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.CRON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('CRON_DATABASE_URL is not set');
  process.exit(1);
}

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const SEASON_TYPE_REGULAR = 2;

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[tuesday-open] Running on ${new Date().toISOString()}`);

  const client = new Client({ connectionString: DATABASE_URL });
  client.on('error', (err) => {
    console.warn('[tuesday-open] Database connection error (ignored):', err.message);
  });

  await client.connect();
  console.log('[tuesday-open] Connected to database.');

  try {
    const leaguesResult = await client.query(
      `SELECT id, name, season FROM leagues WHERE status = 'active'`
    );
    console.log(`[tuesday-open] Found ${leaguesResult.rows.length} active league(s)`);

    for (const league of leaguesResult.rows) {
      await processLeague(client, league);
    }

    console.log('[tuesday-open] Weekly cron job complete');
  } finally {
    await client.end();
  }
}

async function processLeague(client, league) {
  // Most recently locked week — that's the week saturday-lock.js just
  // locked, used below to figure out the next week's number if it doesn't
  // already have a pre-seeded config.
  const lockedConfigResult = await client.query(
    `SELECT id, week FROM week_config
     WHERE league_id = $1 AND is_locked = true
     ORDER BY week DESC LIMIT 1`,
    [league.id]
  );
  const lockedConfig = lockedConfigResult.rows[0] || null;

  // ── Refresh schedule + open the next week ─────────────────────────────

  let nextConfigResult = await client.query(
    `SELECT id, week FROM week_config
     WHERE league_id = $1 AND is_open = false AND is_locked = false
     ORDER BY week LIMIT 1`,
    [league.id]
  );
  let nextConfig = nextConfigResult.rows[0] || null;

  // If no pre-configured week exists and we just evaluated one, auto-create the next week's config
  if (!nextConfig && lockedConfig) {
    const nextWeek = lockedConfig.week + 1;
    const deadline = nextSaturdayElevenFiftyNinePmET();
    const createdResult = await client.query(
      `INSERT INTO week_config (league_id, week, deadline) VALUES ($1, $2, $3)
       ON CONFLICT (league_id, week) DO NOTHING RETURNING id, week`,
      [league.id, nextWeek, deadline]
    );
    if (createdResult.rows[0]) {
      nextConfig = createdResult.rows[0];
      console.log(`[tuesday-open] League "${league.name}" — auto-created config for Week ${nextWeek} (deadline: ${deadline.toISOString()})`);
    }
  }

  if (nextConfig) {
    console.log(`[tuesday-open] League "${league.name}" — refreshing schedule for Week ${nextConfig.week}`);
    const espnGames = await fetchESPNGames(nextConfig.week, league.season);

    let refreshed = 0;
    for (const espn of espnGames) {
      const existingResult = await client.query(
        `SELECT id FROM games
         WHERE league_id = $1 AND week = $2 AND home_team = $3 AND away_team = $4`,
        [league.id, nextConfig.week, espn.homeTeam, espn.awayTeam]
      );

      if (existingResult.rows[0]) {
        await client.query(`UPDATE games SET start_time = $1 WHERE id = $2`, [
          espn.startTime,
          existingResult.rows[0].id,
        ]);
      } else {
        // Fallback: game wasn't seeded at league creation — insert it now
        await client.query(
          `INSERT INTO games (league_id, week, home_team, away_team, start_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [league.id, nextConfig.week, espn.homeTeam, espn.awayTeam, espn.startTime]
        );
      }
      refreshed++;
    }
    console.log(`[tuesday-open] League "${league.name}" Week ${nextConfig.week} — refreshed ${refreshed} game(s)`);

    // Close any other open weeks so only one is active at a time (mirrors openWeek in app/actions/admin.ts)
    await client.query(
      `UPDATE week_config SET is_open = false WHERE league_id = $1 AND is_open = true AND id != $2`,
      [league.id, nextConfig.id]
    );

    await client.query(`UPDATE week_config SET is_open = true WHERE id = $1`, [nextConfig.id]);
    console.log(`[tuesday-open] League "${league.name}" — opened Week ${nextConfig.week}`);
  } else {
    console.log(`[tuesday-open] League "${league.name}" — no week ready to open`);
  }
}

// ─── ESPN FETCH ─────────────────────────────────────────────────────────────

// Schedule only (kickoff times) — no scores/winners, that's check-results.js's job.
function fetchESPNGames(week, season, seasonType = SEASON_TYPE_REGULAR) {
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=${seasonType}&week=${week}&dates=${season}`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Referer': 'https://www.espn.com/',
      'Origin': 'https://www.espn.com',
      'Connection': 'keep-alive',
    },
  };

  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`ESPN returned HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const events = json.events || [];
          const games = events
            .map((event) => {
              const competition = event.competitions?.[0];
              const competitors = competition?.competitors ?? [];
              const home = competitors.find((c) => c.homeAway === 'home');
              const away = competitors.find((c) => c.homeAway === 'away');

              const homeTeam = home?.team?.displayName ?? '';
              const awayTeam = away?.team?.displayName ?? '';
              if (!homeTeam || !awayTeam) return null;

              return {
                id: event.id,
                homeTeam,
                awayTeam,
                startTime: new Date(event.date),
              };
            })
            .filter(Boolean);
          resolve(games);
        } catch (err) {
          reject(new Error(`Failed to parse ESPN response as JSON. First 200 chars: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

// Returns 11:59pm on the coming Saturday in America/New_York, as a UTC Date
function nextSaturdayElevenFiftyNinePmET() {
  const nowUtc = new Date();
  // Interpret current time in ET (toLocaleString trick gives ET clock values as if UTC)
  const etNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const daysUntilSat = ((6 - etNow.getDay()) + 7) % 7 || 7;
  const satET = new Date(etNow);
  satET.setDate(satET.getDate() + daysUntilSat);
  satET.setHours(23, 59, 0, 0);
  // Convert back to real UTC by adding the ET→UTC offset
  const offsetMs = nowUtc.getTime() - etNow.getTime();
  return new Date(satET.getTime() + offsetMs);
}

main().catch((err) => {
  console.error('[tuesday-open] Fatal error:', err.message);
  process.exit(1);
});
