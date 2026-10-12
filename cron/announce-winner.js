#!/usr/bin/env node

/**
 * announce-winner.js — One-off "we have a winner" text blast
 *
 * Run by hand once a survivor pool is decided. Texts every member of the
 * league who the winner is, the total pot (paid players x buy-in), and a link
 * to the standings.
 *
 * Winner:
 *  - exactly one member still alive -> that member
 *  - nobody alive (everyone eliminated in the same week) -> everyone
 *    eliminated in the latest week, splitting the pot
 *  - more than one alive -> refuses unless --force (then all alive split it)
 *
 * Usage:
 *   node cron/announce-winner.js [--league=<id or name>] [--test-phone=+15551234567] [--dry-run] [--force]
 *
 * --league is optional if there's exactly one active league.
 */

const path = require('path');
process.loadEnvFile(path.join(__dirname, '..', '.env.local'));

const { Client } = require('pg');
const { startTunnel, stopTunnel } = require('./lib/db-tunnel');
const { sendMessage } = require('./lib/messages');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.CRON_DATABASE_URL;
const DB_LOCAL_PORT = 5432;
const STANDINGS_URL = 'https://footballpool.kbulmer-projects.com/league';

if (!DATABASE_URL) {
  console.error('CRON_DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const DRY_RUN = rawArgs.includes('--dry-run');
const FORCE = rawArgs.includes('--force');
let LEAGUE_ARG = null;
let TEST_PHONE = null;

for (const arg of rawArgs) {
  if (arg === '--dry-run' || arg === '--force') continue;
  if (arg.startsWith('--league=')) {
    LEAGUE_ARG = arg.slice('--league='.length);
  } else if (arg.startsWith('--test-phone=')) {
    TEST_PHONE = arg.slice('--test-phone='.length);
  } else {
    console.error(`Unrecognized argument: ${arg}`);
    console.error('Usage: node announce-winner.js [--league=<id or name>] [--test-phone=+15551234567] [--dry-run] [--force]');
    process.exit(1);
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Running on ${new Date().toISOString()}` + (DRY_RUN ? ' (DRY RUN)' : '') + (TEST_PHONE ? ` (TEST MODE: ${TEST_PHONE})` : ''));

  console.log('Opening SSH tunnel to raspberrypi.local...');
  const tunnel = await startTunnel(DB_LOCAL_PORT);
  console.log('Tunnel established.');

  const client = new Client({ connectionString: DATABASE_URL });
  client.on('error', (err) => console.warn('Database connection error (ignored):', err.message));

  try {
    await client.connect();
    console.log('Connected to database.');

    const league = await findLeague(client);
    if (!league) return;
    console.log(`League: "${league.name}" (${league.season}), buy-in $${league.buy_in}`);

    const membersResult = await client.query(
      `SELECT u.id AS user_id, u.name, u.phone, lm.is_alive, lm.is_paid, lm.eliminated_week
       FROM league_members lm
       INNER JOIN users u ON u.id = lm.user_id
       WHERE lm.league_id = $1`,
      [league.id]
    );
    const members = membersResult.rows;
    const paid = members.filter((m) => m.is_paid);
    const alive = paid.filter((m) => m.is_alive);

    let winners;
    if (alive.length === 1) {
      winners = alive;
    } else if (alive.length === 0) {
      const lastWeek = Math.max(...paid.map((m) => m.eliminated_week ?? 0));
      winners = paid.filter((m) => m.eliminated_week === lastWeek);
      console.log(`Nobody left alive — the ${winners.length} player(s) eliminated in Week ${lastWeek} are the winners.`);
    } else if (FORCE) {
      winners = alive;
      console.log(`--force: ${alive.length} players still alive, treating all as co-winners.`);
    } else {
      console.error(`${alive.length} paid players are still alive (${alive.map((m) => m.name).join(', ')}) — no winner yet. Use --force to announce them as co-winners.`);
      process.exitCode = 1;
      return;
    }
    if (winners.length === 0) {
      console.error('No paid members found — nothing to announce.');
      process.exitCode = 1;
      return;
    }

    const pot = paid.length * Number(league.buy_in);
    const message = buildMessage(league, winners, pot);
    console.log(`Pot: ${paid.length} paid player(s) x $${league.buy_in} = ${formatMoney(pot)}`);
    console.log(`Message:\n${message}\n`);

    let recipients = members.filter((m) => m.phone && m.phone.trim() !== '');
    if (TEST_PHONE) {
      recipients = recipients.filter((m) => m.phone === TEST_PHONE);
      console.log(`TEST MODE — restricting to ${recipients.length} recipient(s) matching ${TEST_PHONE}.`);
    }
    console.log(`${recipients.length} recipient(s) of ${members.length} member(s) have a phone number.`);

    const failures = [];
    for (const r of recipients) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would text ${r.name || r.phone}`);
        continue;
      }
      try {
        const service = sendMessage(r.phone, message);
        console.log(`✓ Sent to ${r.name || r.phone} via ${service}`);
        await sleep(1000);
      } catch (err) {
        console.error(`✗ Failed to send to ${r.name || r.phone}: ${err.message}`);
        failures.push({ name: r.name, phone: r.phone, reason: err.message });
      }
    }

    console.log('Done.');
    if (failures.length > 0) {
      console.error(`\n${failures.length} of ${recipients.length} message(s) failed to send:`);
      for (const f of failures) console.error(`  - ${f.name || f.phone} (${f.phone}): ${f.reason}`);
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

async function findLeague(client) {
  if (LEAGUE_ARG) {
    const result = await client.query(
      `SELECT id, name, season, buy_in FROM leagues
       WHERE game_type = 'survivor' AND status != 'deleted' AND (id::text = $1 OR name ILIKE $1)`,
      [LEAGUE_ARG]
    );
    if (result.rows.length === 1) return result.rows[0];
    console.error(result.rows.length === 0 ? `No survivor league matches "${LEAGUE_ARG}".` : `"${LEAGUE_ARG}" matches ${result.rows.length} leagues — pass the id instead.`);
    process.exitCode = 1;
    return null;
  }

  const result = await client.query(
    `SELECT id, name, season, buy_in FROM leagues WHERE game_type = 'survivor' AND status = 'active'`
  );
  if (result.rows.length === 1) return result.rows[0];
  console.error(result.rows.length === 0
    ? 'No active survivor league found — pass --league=<id or name> (e.g. if it was already marked completed).'
    : `Multiple active survivor leagues (${result.rows.map((l) => `${l.name} [${l.id}]`).join(', ')}) — pass --league=<id or name>.`);
  process.exitCode = 1;
  return null;
}

function buildMessage(league, winners, pot) {
  const names = winners.map((w) => w.name || 'Unknown');
  if (winners.length === 1) {
    return `We have a winner! ${names[0]} wins the ${league.name} survivor pool and takes home ${formatMoney(pot)}. Congrats! Final standings: ${STANDINGS_URL}`;
  }
  const each = formatMoney(pot / winners.length);
  const joined = names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  return `We have winners! ${joined} win the ${league.name} survivor pool and split ${formatMoney(pot)} (${each} each). Congrats! Final standings: ${STANDINGS_URL}`;
}

function formatMoney(amount) {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
