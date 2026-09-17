#!/usr/bin/env node

/**
 * saturday-lock.js — Weekly pick-lock job
 *
 * Locks the earliest open-but-unlocked week for every league (and every pick
 * in it), so no more picks can be made or changed. Talks directly to the
 * Raspberry Pi's Postgres container — no more HTTP call to a Next.js route.
 *
 * Meant to run inside the same Docker network as the `db` container, with
 * CRON_DATABASE_URL passed in via docker-compose (so the "db" hostname
 * resolves), scheduled for Sunday 12:00am ET, e.g. via the Pi's host crontab:
 *   0 0 * * 0  docker compose run --rm saturday-lock
 */

const { Client } = require('pg');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.CRON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('CRON_DATABASE_URL is not set');
  process.exit(1);
}

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
    const leaguesResult = await client.query(`SELECT id, name FROM leagues`);
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

main().catch((err) => {
  console.error('[saturday-lock] Fatal error:', err.message);
  process.exit(1);
});
