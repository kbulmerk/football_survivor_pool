import { NextRequest, NextResponse } from 'next/server';
import { and, eq, notExists } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leagueMembers, leagues, picks, users, weekConfig } from '@/lib/schema';
import { sendSMS } from '@/lib/twilio';

function verifyCronSecret(req: NextRequest) {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allLeagues = await db.select().from(leagues);

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

    if (!config) continue;

    // Find alive + paid members who have NOT picked this week
    const membersWithoutPicks = await db
      .select({ phone: users.phone, name: users.name })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(
        and(
          eq(leagueMembers.leagueId, league.id),
          eq(leagueMembers.isAlive, true),
          eq(leagueMembers.isPaid, true),
          notExists(
            db
              .select()
              .from(picks)
              .where(
                and(
                  eq(picks.leagueId, league.id),
                  eq(picks.userId, leagueMembers.userId),
                  eq(picks.week, config.week)
                )
              )
          )
        )
      );

    for (const member of membersWithoutPicks) {
      if (!member.phone) continue;
      await sendSMS(
        member.phone,
        `⚠️ ${league.name} — You haven't made your Week ${config.week} pick yet! Deadline is tonight at midnight. Log in now!`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
