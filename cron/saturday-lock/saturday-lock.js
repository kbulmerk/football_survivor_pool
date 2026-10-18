#!/usr/bin/env node

/**
 * saturday-lock.js — Weekly pick-lock job
 *
 * Locks the earliest open-but-unlocked week for every league (and every pick
 * in it), so no more picks can be made or changed. Before locking, any paid,
 * alive member without a pick is auto-assigned a random team they haven't
 * used, playing Sunday or Monday, and not favored per ESPN's line (see
 * autoAssignMissingPicks). Talks directly to the
 * Raspberry Pi's Postgres container — no more HTTP call to a Next.js route.
 *
 * Meant to run inside the same Docker network as the `db` container, with
 * CRON_DATABASE_URL passed in via docker-compose (so the "db" hostname
 * resolves), scheduled for Sunday 12:00am ET, e.g. via the Pi's host crontab:
 *   0 0 * * 0  docker compose run --rm saturday-lock
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
// site.api.espn.com is occasionally hit with a transient Akamai block; this
// undocumented sibling host serves the same scoreboard data and has stayed
// reachable when the primary host hasn't.
const ESPN_SCOREBOARD_FALLBACK_URL = 'https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const SEASON_TYPE_REGULAR = 2;

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[saturday-lock] Running on ${new Date().toISOString()}`);

  const client = new Client({ connectionString: DATABASE_URL });
  client.on('error', (err) => {
    console.warn('[saturday-lock] Database connection error (ignored):', err.message);
  });

  await client.connect();
  console.log('[saturday-lock] Connected to database.');

  try {
    const leaguesResult = await client.query(`SELECT id, name, season FROM leagues`);
    console.log(`[saturday-lock] Found ${leaguesResult.rows.length} league(s)`);

    for (const league of leaguesResult.rows) {
      const configResult = await client.query(
        `SELECT id, week FROM week_config
         WHERE league_id = $1 AND is_open = true AND is_locked = false
         ORDER BY week LIMIT 1`,
        [league.id]
      );

      if (configResult.rows.length === 0) {
        console.log(`[saturday-lock] League "${league.name}" — no open/unlocked week, skipping`);
        continue;
      }

      const config = configResult.rows[0];
      console.log(`[saturday-lock] League "${league.name}" — locking Week ${config.week}`);

      await autoAssignMissingPicks(client, league, config.week);

      await client.query(`UPDATE week_config SET is_locked = true WHERE id = $1`, [config.id]);
      await client.query(
        `UPDATE picks SET is_locked = true WHERE league_id = $1 AND week = $2`,
        [league.id, config.week]
      );

      console.log(`[saturday-lock] League "${league.name}" Week ${config.week} — locked successfully`);
    }

    console.log('[saturday-lock] Cron job complete');
  } finally {
    await client.end();
  }
}

// ─── AUTO-PICK ──────────────────────────────────────────────────────────────

// Gives every paid, alive member without a pick for `week` a random team that
// they haven't used, whose game is on Sunday or Monday (ET) and hasn't kicked
// off, and that isn't favored per ESPN's line. If ESPN's odds can't be
// fetched, falls back to any eligible Sunday/Monday team rather than leaving
// the member without a pick. Mirrors autoAssignMissingPicksForWeek in
// lib/survivor-rules.ts (used by the admin Lock Picks button) — keep the
// two in sync.
async function autoAssignMissingPicks(client, league, week) {
  const missingResult = await client.query(
    `SELECT lm.user_id FROM league_members lm
     WHERE lm.league_id = $1 AND lm.is_paid = true AND lm.is_alive = true
       AND NOT EXISTS (
         SELECT 1 FROM picks p
         WHERE p.league_id = lm.league_id AND p.user_id = lm.user_id AND p.week = $2
       )`,
    [league.id, week]
  );
  if (missingResult.rows.length === 0) return;

  const gamesResult = await client.query(
    `SELECT home_team, away_team, start_time FROM games
     WHERE league_id = $1 AND week = $2 AND is_excluded = false`,
    [league.id, week]
  );
  const now = new Date();
  const sundayMondayGames = gamesResult.rows.filter((g) => {
    const day = new Date(g.start_time).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
    return (day === 'Sun' || day === 'Mon') && new Date(g.start_time) > now;
  });
  let candidates = sundayMondayGames.flatMap((g) => [g.home_team, g.away_team]);

  let favorites = null;
  try {
    favorites = await fetchESPNFavorites(week, league.season);
  } catch (err) {
    console.warn(`[saturday-lock] League "${league.name}" — ESPN odds fetch failed (${err.message}), auto-picking without the underdog filter`);
  }
  if (favorites) candidates = candidates.filter((t) => !favorites.has(t));

  for (const { user_id } of missingResult.rows) {
    const usedResult = await client.query(
      `SELECT team_picked FROM picks WHERE league_id = $1 AND user_id = $2`,
      [league.id, user_id]
    );
    const used = new Set(usedResult.rows.map((r) => r.team_picked));
    const available = candidates.filter((t) => !used.has(t));

    if (available.length === 0) {
      console.warn(`[saturday-lock] League "${league.name}" Week ${week} — no eligible auto-pick for user ${user_id}`);
      continue;
    }

    const team = available[Math.floor(Math.random() * available.length)];
    await client.query(
      `INSERT INTO picks (league_id, user_id, week, team_picked)
       VALUES ($1, $2, $3, $4) ON CONFLICT (league_id, user_id, week) DO NOTHING`,
      [league.id, user_id, week, team]
    );
    console.log(`[saturday-lock] League "${league.name}" Week ${week} — auto-picked ${team} for user ${user_id}`);
  }
}

// ─── ESPN FETCH ─────────────────────────────────────────────────────────────

// Set of team names ESPN lists as the favorite in this week's games. Games
// without odds (or pick'ems) contribute no favorite.
function fetchESPNFavorites(week, season, seasonType = SEASON_TYPE_REGULAR) {
  const query = `?seasontype=${seasonType}&week=${week}&dates=${season}`;
  return fetchESPNUrl(`${ESPN_SCOREBOARD_URL}${query}`).catch((err) => {
    console.warn(`[saturday-lock] Primary ESPN host failed (${err.message}) — retrying against site.web.api.espn.com`);
    return fetchESPNUrl(`${ESPN_SCOREBOARD_FALLBACK_URL}${query}`);
  });
}

function fetchESPNUrl(url) {
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
          const favorites = new Set();
          for (const event of json.events || []) {
            const competition = event.competitions?.[0];
            const odds = competition?.odds?.[0];
            if (!odds) continue;
            for (const c of competition.competitors ?? []) {
              const side = c.homeAway === 'home' ? odds.homeTeamOdds : odds.awayTeamOdds;
              if (side?.favorite && c.team?.displayName) favorites.add(c.team.displayName);
            }
          }
          resolve(favorites);
        } catch (err) {
          reject(new Error(`Failed to parse ESPN response as JSON. First 200 chars: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

main().catch((err) => {
  console.error('[saturday-lock] Fatal error:', err.message);
  process.exit(1);
});
