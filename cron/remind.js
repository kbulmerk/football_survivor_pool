#!/usr/bin/env node

/**
 * remind.js — Twice-weekly SMS reminder script
 *
 * Fetches phone numbers from your Railway PostgreSQL database
 * and sends a message via your Mac's Messages app (your own number).
 *
 * Schedule with cron:
 *   crontab -e
 *   0 9 * * 2,6  node /path/to/remind.js
 *   (runs at 9:00am every Tuesday and Saturday)
 */

const path = require('path');
process.loadEnvFile(path.join(__dirname, '..', '.env.local'));

const { Client } = require('pg');
const { startTunnel, stopTunnel } = require('./lib/db-tunnel');
const { sendMessage } = require('./lib/messages');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.CRON_DATABASE_URL;
const DB_LOCAL_PORT = 5432;

if (!DATABASE_URL) {
  console.error('CRON_DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const day = process.argv[2];
const VALID_DAYS = ['tuesday', 'saturday'];
// Optional 3rd arg: test with just one number instead of the full DB list
//   node remind.js tuesday +15551234567
const TEST_PHONE = process.argv[3] || null;

if (!VALID_DAYS.includes(day)) {
  console.error(`Usage: node remind.js <day> [testPhoneNumber]`);
  console.error(`Available days: ${VALID_DAYS.join(', ')}`);
  process.exit(1);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Running on ${new Date().toISOString()}` + (TEST_PHONE ? ` (TEST MODE: ${TEST_PHONE})` : ''));

  console.log('Opening SSH tunnel to raspberrypi.local...');
  const tunnel = await startTunnel(DB_LOCAL_PORT);
  console.log('Tunnel established.');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  // Prevent tunnel/connection hiccups from crashing the process
  client.on('error', (err) => {
    console.warn('Database connection error (ignored):', err.message);
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Get all active league IDs
    const activeLeagues = await client.query(
      `SELECT id FROM leagues WHERE status = 'active'`
    );
    const activeLeagueIds = activeLeagues.rows.map(r => r.id);
    console.log(`Found ${activeLeagueIds.length} active league(s).`);

    if (activeLeagueIds.length === 0) {
      console.log('No active leagues — nothing to send.');
      return;
    }

    // Get current week across active leagues (highest open week)
    const current_week = await client.query(
      `SELECT week FROM week_config
       WHERE league_id = ANY($1) AND is_open = true
       ORDER BY week DESC LIMIT 1`,
      [activeLeagueIds]
    );

    if (current_week.rows.length === 0) {
      console.log('No open week found — nothing to send.');
      return;
    }
    const week = current_week.rows[0].week;
    console.log(`Current week: ${week}`);

    const MESSAGES = {
      tuesday: `Hey Week ${week} is open! Don't forget to make your pick before the deadline! (This is an automated message) https://footballpool.kbulmer-projects.com/pick`,
      saturday: `Hey just a reminder to make your pick for Week ${week}! The deadline to make your pick is tonight at 11:59pm. Good luck! (This is an automated message) https://footballpool.kbulmer-projects.com/pick`,
    };
    const MESSAGE = MESSAGES[day];

    const isSaturday = day === 'saturday';

    // Fetch alive users with phone numbers who haven't made a pick yet (if Saturday)
    const result = await client.query(
      `SELECT DISTINCT u.name, u.phone
      FROM users u
      INNER JOIN league_members lm ON lm.user_id = u.id
      WHERE lm.league_id = ANY($1)
        AND lm.is_alive = true
        AND u.phone IS NOT NULL
        AND u.phone != ''
        ${isSaturday ? `
        AND NOT EXISTS (
          SELECT 1 FROM picks p
          WHERE p.user_id = u.id
            AND p.league_id = lm.league_id
            AND p.week = $2
        )` : ''}`,
      isSaturday ? [activeLeagueIds, week] : [activeLeagueIds]
    );

    let users = result.rows;

    if (TEST_PHONE) {
      console.log(`TEST MODE — overriding recipient list with ${TEST_PHONE}`);
      users = [{ name: 'Test User', phone: TEST_PHONE }];
    }

    console.log(`Found ${users.length} alive users with phone numbers.`);

    const failures = [];

    for (const user of users) {
      try {
        console.log(`phone number: ${user.phone}`);
        const service = sendMessage(user.phone, MESSAGE);
        console.log(`✓ Sent to ${user.name || user.phone} via ${service}`);
        // Small delay between messages to avoid overwhelming Messages app
        await sleep(1000);
      } catch (err) {
        console.error(`✗ Failed to send to ${user.name || user.phone}: ${err.message}`);
        failures.push({ name: user.name, phone: user.phone, reason: err.message });
      }
    }

    console.log('Done.');

    if (failures.length > 0) {
      console.error(`\n${failures.length} of ${users.length} message(s) failed to send:`);
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();