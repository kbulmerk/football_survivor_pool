import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagues, weekConfig } from '@/lib/schema';
import { evaluateResults } from '@/lib/survivor-rules';
import { sendSMS } from '@/lib/twilio';
import { leagueMembers, users } from '@/lib/schema';

function verifyCronSecret(req: NextRequest) {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[monday-results] Starting cron job');

  const allLeagues = await db.select().from(leagues);
  console.log(`[monday-results] Found ${allLeagues.length} league(s)`);

  for (const league of allLeagues) {
    const [config] = await db
      .select()
      .from(weekConfig)
      .where(
        and(
          eq(weekConfig.leagueId, league.id),
          eq(weekConfig.isLocked, true),
          eq(weekConfig.isEvaluated, false)
        )
      )
      .orderBy(weekConfig.week)
      .limit(1);

    if (!config) {
      console.log(`[monday-results] League "${league.name}" — no locked/unevaluated week, skipping`);
      continue;
    }

    console.log(`[monday-results] League "${league.name}" — evaluating Week ${config.week} results`);

    await evaluateResults(league.id, config.week);

    await db
      .update(weekConfig)
      .set({ isEvaluated: true })
      .where(eq(weekConfig.id, config.id));

    console.log(`[monday-results] League "${league.name}" Week ${config.week} — evaluation complete`);

    // Notify surviving members
    const alive = await db
      .select({ phone: users.phone })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(
        and(
          eq(leagueMembers.leagueId, league.id),
          eq(leagueMembers.isAlive, true),
          eq(leagueMembers.isPaid, true)
        )
      );

    console.log(`[monday-results] League "${league.name}" Week ${config.week} — notifying ${alive.length} surviving member(s)`);

    let sent = 0;
    for (const member of alive) {
      if (!member.phone) continue;
      await sendSMS(
        member.phone,
        `✅ ${league.name} — Week ${config.week} results are in! You're still alive. Picks for next week open Tuesday.`
      );
      sent++;
    }

    console.log(`[monday-results] League "${league.name}" Week ${config.week} — sent ${sent} SMS notification(s)`);
  }

  console.log('[monday-results] Cron job complete');
  return NextResponse.json({ ok: true });
}
