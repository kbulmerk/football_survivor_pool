import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagueMembers, leagues, users, weekConfig } from '@/lib/schema';
import { sendSMS } from '@/lib/twilio';

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Open the current week for all active leagues
  const allLeagues = await db.select().from(leagues);

  for (const league of allLeagues) {
    // Find the config row with the lowest locked=false, open=false week
    const [config] = await db
      .select()
      .from(weekConfig)
      .where(
        and(
          eq(weekConfig.leagueId, league.id),
          eq(weekConfig.isOpen, false),
          eq(weekConfig.isLocked, false)
        )
      )
      .orderBy(weekConfig.week)
      .limit(1);

    if (!config) continue;

    await db
      .update(weekConfig)
      .set({ isOpen: true })
      .where(eq(weekConfig.id, config.id));

    // SMS all alive + paid members
    const members = await db
      .select({ phone: users.phone, name: users.name })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(
        and(
          eq(leagueMembers.leagueId, league.id),
          eq(leagueMembers.isAlive, true),
          eq(leagueMembers.isPaid, true)
        )
      );

    for (const member of members) {
      if (!member.phone) continue;
      await sendSMS(
        member.phone,
        `🏈 ${league.name} — Week ${config.week} picks are open! Log in to make your pick before the deadline.`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
