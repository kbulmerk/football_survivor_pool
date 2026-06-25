import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagues, picks, weekConfig } from '@/lib/schema';

function verifyCronSecret(req: NextRequest) {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[saturday-lock] Starting cron job');

  const allLeagues = await db.select().from(leagues);
  console.log(`[saturday-lock] Found ${allLeagues.length} league(s)`);

  for (const league of allLeagues) {
    const [config] = await db
      .select()
      .from(weekConfig)
      .where(
        and(
          eq(weekConfig.leagueId, league.id),
          eq(weekConfig.isOpen, true),
          eq(weekConfig.isLocked, false)
        )
      )
      .orderBy(weekConfig.week)
      .limit(1);

    if (!config) {
      console.log(`[saturday-lock] League "${league.name}" — no open/unlocked week, skipping`);
      continue;
    }

    console.log(`[saturday-lock] League "${league.name}" — locking Week ${config.week}`);

    await db
      .update(weekConfig)
      .set({ isLocked: true })
      .where(eq(weekConfig.id, config.id));

    const lockedPicks = await db
      .update(picks)
      .set({ isLocked: true })
      .where(
        and(eq(picks.leagueId, league.id), eq(picks.week, config.week))
      );

    console.log(`[saturday-lock] League "${league.name}" Week ${config.week} — locked successfully`);
  }

  console.log('[saturday-lock] Cron job complete');
  return NextResponse.json({ ok: true });
}
