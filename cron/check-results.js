#!/usr/bin/env node

/**
 * check-results.js — Post-slate game result checker
 *
 * After each NFL game slate ends, checks final scores from ESPN,
 * marks eliminated users in the Postgres DB, and texts everyone who
 * had a pick in that slate letting them know if they're safe or out.
 *
 * Self-reschedules if a game in the slate is still live (e.g. overtime
 * running long) — rechecks every 15 min, up to 3 attempts total.
 *
 * Schedule with cron (ET times, no Thursday games):
 *   crontab -e
 *   30 16 * * 0   node /path/to/check-results.js early   # ~4:30pm Sun
 *   45 19 * * 0   node /path/to/check-results.js late    # ~7:45pm Sun
 *   45 23 * * 0   node /path/to/check-results.js snf     # ~11:45pm Sun
 *   45 23 * * 1   node /path/to/check-results.js mnf     # ~11:45pm Mon
 */

const path = require('path');
process.loadEnvFile(path.join(__dirname, '..', '.env.local'));

const { Client } = require('pg');
const https = require('https');
const { startTunnel, stopTunnel } = require('./lib/db-tunnel');
const { sendMessage } = require('./lib/messages');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

// Same connection string as remind.js
const DATABASE_URL = process.env.CRON_DATABASE_URL;
const DB_LOCAL_PORT = 5432;

if (!DATABASE_URL) {
  console.error('CRON_DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

const rawArgs = process.argv.slice(2);
let slate = null;
let TEST_PHONE = null;
let DATE_OVERRIDE = null;
const DRY_RUN = rawArgs.includes('--dry-run');

// Explicit flags only — no positional guessing. This avoids ever mistaking
// a date for a phone number or vice versa.
//   node check-results.js early --test-phone=+15551234567 --date=20260913 --dry-run
for (const arg of rawArgs) {
  if (arg === '--dry-run') continue;
  if (arg.startsWith('--test-phone=')) {
    TEST_PHONE = arg.split('=')[1];
  } else if (arg.startsWith('--date=')) {
    DATE_OVERRIDE = arg.split('=')[1];
  } else if (!slate) {
    slate = arg;
  } else {
    console.error(`Unrecognized argument: ${arg}`);
    process.exit(1);
  }
}

const VALID_SLATES = ['early', 'late', 'snf', 'mnf'];

const TOTAL_WEEKS = 18;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15 * 60 * 1000; // 15 minutes

// ET day/hour windows used to match ESPN games to a slate.
// day: 0=Sun, 1=Mon. Adjust hourMin/hourMax if a slate's kickoff shifts.
const SLATE_WINDOWS = {
  early: { day: 0, hourMin: 12, hourMax: 14 }, // ~1:00pm ET Sunday games
  late:  { day: 0, hourMin: 15, hourMax: 17 }, // ~4:05/4:25pm ET Sunday games
  snf:   { day: 0, hourMin: 19, hourMax: 21 }, // Sunday Night Football
  mnf:   { day: 1, hourMin: 19, hourMax: 21 }, // Monday Night Football
};

if (!VALID_SLATES.includes(slate)) {
  console.error(`Usage: node check-results.js <slate> [--test-phone=+15551234567] [--date=YYYYMMDD] [--dry-run]`);
  console.error(`Available slates: ${VALID_SLATES.join(', ')}`);
  process.exit(1);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main(attempt = 1) {
  console.log(`Running on ${new Date().toISOString()}` + (TEST_PHONE ? ` (TEST MODE: ${TEST_PHONE})` : '') + (DATE_OVERRIDE ? ` (DATE OVERRIDE: ${DATE_OVERRIDE})` : ''));
  console.log(`--- Checking "${slate}" slate (attempt ${attempt}/${MAX_ATTEMPTS}) ---`);

  const games = await fetchSlateGames(slate);

  if (games.length === 0) {
    console.log('No games found for this slate — nothing to do.');
    return;
  }

  const stillLive = games.filter(g => !g.isFinal);

  if (stillLive.length > 0 && attempt < MAX_ATTEMPTS) {
    console.log(`${stillLive.length} game(s) still in progress (likely overtime). Rechecking in 15 min.`);
    setTimeout(() => main(attempt + 1), RETRY_DELAY_MS);
    return;
  }

  if (stillLive.length > 0) {
    console.log(`${stillLive.length} game(s) still not final after ${MAX_ATTEMPTS} attempts — processing the rest, these will need a later/manual check.`);
  }

  const finalGames = games.filter(g => g.isFinal);
  if (finalGames.length === 0) {
    console.log('No final games to process.');
    return;
  }

  await processResults(finalGames);
}

// ─── ESPN FETCH + SLATE MATCHING ───────────────────────────────────────────

function fetchSlateGames(slateName) {
  const url = DATE_OVERRIDE
    ? `${ESPN_SCOREBOARD_URL}?dates=${DATE_OVERRIDE}`
    : ESPN_SCOREBOARD_URL;

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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`ESPN returned HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const window = SLATE_WINDOWS[slateName];
          const games = (json.events || [])
            .map(event => {
              const kickoff = new Date(event.date);
              const et = toETParts(kickoff);
              const competition = event.competitions[0];
              const status = competition.status.type;
              const [teamA, teamB] = competition.competitors;
              return {
                id: event.id,
                etDay: et.day,
                etHour: et.hour,
                isFinal: status.completed === true,
                teamA: teamA.team.displayName,
                teamAWinner: teamA.winner === true,
                teamB: teamB.team.displayName,
                teamBWinner: teamB.winner === true,
              };
            })
            .filter(g => g.etDay === window.day && g.etHour >= window.hourMin && g.etHour < window.hourMax);
          resolve(games);
        } catch (err) {
          reject(new Error(`Failed to parse ESPN response as JSON. First 200 chars: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function toETParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekdayStr = parts.find(p => p.type === 'weekday').value;
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[weekdayStr], hour };
}

// ─── DB UPDATE + TEXTING ───────────────────────────────────────────────────

async function processResults(finalGames) {
  console.log('Opening SSH tunnel to raspberrypi.local...');
  const tunnel = await startTunnel(DB_LOCAL_PORT);
  console.log('Tunnel established.');

  const client = new Client({
    connectionString: DATABASE_URL,
  });
  client.on('error', (err) => console.warn('Database connection error (ignored):', err.message));

  try {
    await client.connect();
    console.log('Connected to database.');

    // Winning team abbreviations from this slate — since this is a "pick a
    // team to lose" pool, picking a team that WON is what eliminates you.
    const winningTeams = new Set();
    for (const g of finalGames) {
      if (g.teamAWinner === true) winningTeams.add(g.teamA);
      if (g.teamBWinner === true) winningTeams.add(g.teamB);
    }
    console.log('Winning teams this slate:', [...winningTeams]);

    const activeLeagues = await client.query(`SELECT id FROM leagues WHERE status = 'active'`);
    const activeLeagueIds = activeLeagues.rows.map(r => r.id);
    if (activeLeagueIds.length === 0) {
      console.log('No active leagues — nothing to process.');
      return;
    }

    const current_week = await client.query(
      `SELECT week FROM week_config
       WHERE league_id = ANY($1) AND is_open = true
       ORDER BY week DESC LIMIT 1`,
      [activeLeagueIds]
    );
    if (current_week.rows.length === 0) {
      console.log('No open week found — nothing to process.');
      return;
    }
    const week = current_week.rows[0].week;
    console.log(`Current week: ${week}`);

    const picksResult = await client.query(
      `SELECT p.id AS pick_id, u.id AS user_id, u.name, u.phone, p.team_picked AS team,
              lm.id AS league_member_id, lm.league_id
       FROM picks p
       INNER JOIN users u ON u.id = p.user_id
       INNER JOIN league_members lm ON lm.user_id = u.id AND lm.league_id = p.league_id
       WHERE p.week = $1
         AND lm.league_id = ANY($2)
         AND lm.is_alive = true
         AND u.phone IS NOT NULL
         AND u.phone != ''`,
      [week, activeLeagueIds]
    );

    let picks = picksResult.rows;
    console.log(`Base query matched ${picks.length} pick(s) before slate filtering.`);
    if (TEST_PHONE) {
      const rawMatch = picks.find(p => p.phone === TEST_PHONE);
      if (rawMatch) {
        console.log(`Found your pick in the base query: team_picked="${rawMatch.team}", league_member_id=${rawMatch.league_member_id}`);
      } else {
        console.log(`No row for ${TEST_PHONE} in the base query at all — check that your users.phone value matches exactly (formatting, +1, etc.), that you have a picks row for week ${week}, and that your league_members.is_alive is true.`);
      }
    }

    // Only resolve picks for teams that actually played in this slate
    const slateTeams = new Set();
    for (const g of finalGames) {
      slateTeams.add(g.teamA);
      slateTeams.add(g.teamB);
    }
    console.log(`Slate teams (from ESPN, this slate):`, [...slateTeams]);
    picks = picks.filter(p => slateTeams.has(p.team));

    if (TEST_PHONE) {
      const matched = picks.filter(p => p.phone === TEST_PHONE);
      if (matched.length > 0) {
        console.log(`TEST MODE — restricting to ${matched.length} pick(s) belonging to ${TEST_PHONE}.`);
        picks = matched;
      } else {
        console.log(`TEST MODE — no pick found for ${TEST_PHONE} this slate. Not sending to anyone; nothing to do.`);
        picks = [];
      }
    }

    console.log(`Found ${picks.length} pick(s) to resolve for this slate.`);

    const failures = [];

    for (const pick of picks) {
      const eliminated = winningTeams.has(pick.team);

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would mark pick ${pick.pick_id} as ${eliminated ? 'eliminated' : 'correct'}${eliminated ? ` and set league_members ${pick.league_member_id} is_alive = false` : ''}, and text ${pick.name || pick.phone}.`);
        continue;
      }

      if (pick.pick_id) {
        await client.query(
          `UPDATE picks SET result = $1 WHERE id = $2`,
          [eliminated ? 'eliminated' : 'correct', pick.pick_id]
        );

        if (eliminated) {
          await client.query(
            `UPDATE league_members SET is_alive = false WHERE id = $1`,
            [pick.league_member_id]
          );
        }
      }

      const message = eliminated
        ? `Bad news — your Week ${week} pick (${pick.team}) won. You've been eliminated! (This is an automated message) https://footballpool.kbulmer-projects.com/league`
        : `Good news — your Week ${week} pick (${pick.team}) lost! You're still alive. (This is an automated message) https://footballpool.kbulmer-projects.com/league`;

      try {
        const service = sendMessage(pick.phone, message);
        console.log(`✓ Sent to ${pick.name || pick.phone} via ${service} (${eliminated ? 'eliminated' : 'safe'})`);
        await sleep(1000);
      } catch (err) {
        console.error(`✗ Failed to send to ${pick.name || pick.phone}: ${err.message}`);
        failures.push({ name: pick.name, phone: pick.phone, reason: err.message });
      }
    }

    if (!DRY_RUN) {
      for (const leagueId of activeLeagueIds) {
        const completed = await checkAndCompleteLeague(client, leagueId, week);
        if (completed) {
          console.log(`League ${leagueId} — pool complete (winner emerged or season over), marked completed.`);
        }
      }
    }

    console.log('Done.');

    if (failures.length > 0) {
      console.error(`\n${failures.length} of ${picks.length} message(s) failed to send:`);
      for (const f of failures) {
        console.error(`  - ${f.name || f.phone} (${f.phone}): ${f.reason}`);
      }
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Database error:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    stopTunnel(tunnel);
  }
}

/**
 * Marks a league completed when the pool is over. A league is over when either:
 *  - one or fewer paid members remain alive (a winner has emerged), or
 *  - this was Week 18's Monday Night Football check (the season's last
 *    regularly scheduled slate — won't fire if a given Week 18 has no MNF
 *    game; complete manually in that case).
 * No-op if the league isn't currently active. Returns true if it completed it.
 */
async function checkAndCompleteLeague(client, leagueId, week) {
  const leagueResult = await client.query(`SELECT status FROM leagues WHERE id = $1`, [leagueId]);
  const league = leagueResult.rows[0];
  if (!league || league.status !== 'active') return false;

  const aliveMembersResult = await client.query(
    `SELECT id FROM league_members WHERE league_id = $1 AND is_alive = true AND is_paid = true`,
    [leagueId]
  );

  const seasonOver = week === TOTAL_WEEKS && slate === 'mnf';
  const shouldComplete = aliveMembersResult.rows.length <= 1 || seasonOver;
  if (!shouldComplete) return false;

  await client.query(`UPDATE leagues SET status = 'completed' WHERE id = $1`, [leagueId]);
  return true;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});