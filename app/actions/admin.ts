'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { games, leagues, leagueMembers, paymentStatus, picks, users, weekConfig } from '@/lib/schema';
import { requireAdmin } from '@/lib/auth';
import { autoAssignMissingPicksForWeek } from '@/lib/survivor-rules';
import { fetchESPNGames } from '@/lib/espn';

export async function markPaid(leagueId: string, userId: string, amount: number) {
  const admin = await requireAdmin();

  await db
    .update(leagueMembers)
    .set({ isPaid: true })
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId))
    );

  await db.insert(paymentStatus).values({
    leagueId,
    userId,
    amount: String(amount),
    markedBy: admin.id,
  });

  revalidatePath('/admin');
  revalidatePath('/league');
}

export async function setDeadline(leagueId: string, week: number, deadline: Date) {
  await requireAdmin();

  await db
    .insert(weekConfig)
    .values({ leagueId, week, deadline })
    .onConflictDoUpdate({
      target: [weekConfig.leagueId, weekConfig.week],
      set: { deadline },
    });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

export async function excludeGame(gameId: string, excluded: boolean) {
  await requireAdmin();

  await db.update(games).set({ isExcluded: excluded }).where(eq(games.id, gameId));

  revalidatePath('/admin');
  revalidatePath('/pick');
}

export async function overrideElimination(leagueId: string, userId: string, isAlive: boolean, week?: number) {
  await requireAdmin();

  await db
    .update(leagueMembers)
    .set({ isAlive, eliminatedWeek: isAlive ? null : (week ?? null) })
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId))
    );

  revalidatePath('/admin');
  revalidatePath('/league');
}

export async function openWeek(leagueId: string, week: number) {
  await requireAdmin();

  // Close any other open weeks so only one is active at a time
  await db
    .update(weekConfig)
    .set({ isOpen: false })
    .where(
      and(
        eq(weekConfig.leagueId, leagueId),
        eq(weekConfig.isOpen, true),
        ne(weekConfig.week, week)
      )
    );

  await db
    .update(weekConfig)
    .set({ isOpen: true, isLocked: false })
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

export async function lockWeek(leagueId: string, week: number) {
  await requireAdmin();

  await db
    .update(weekConfig)
    .set({ isLocked: true })
    .where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  await autoAssignMissingPicksForWeek(leagueId, week);

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/league');
}

export async function backfillMissingPicks(leagueId: string) {
  await requireAdmin();

  const now = new Date();
  const configs = await db
    .select()
    .from(weekConfig)
    .where(eq(weekConfig.leagueId, leagueId));

  const pastWeeks = configs.filter((c) => c.isLocked || new Date(c.deadline) < now);

  for (const config of pastWeeks) {
    await autoAssignMissingPicksForWeek(leagueId, config.week);
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/league');
}

export async function upsertGame(
  leagueId: string,
  week: number,
  homeTeam: string,
  awayTeam: string,
  startTime: Date,
  winner?: string
) {
  await requireAdmin();

  await db.insert(games).values({
    leagueId,
    week,
    homeTeam,
    awayTeam,
    startTime,
    winner: winner ?? null,
  });

  revalidatePath('/admin');
  revalidatePath('/pick');
}

export async function seedTestGames(leagueId: string, week: number) {
  await requireAdmin();

  const testGames = [
    { homeTeam: 'Kansas City Chiefs', awayTeam: 'Baltimore Ravens' },
    { homeTeam: 'San Francisco 49ers', awayTeam: 'Dallas Cowboys' },
    { homeTeam: 'Buffalo Bills', awayTeam: 'Miami Dolphins' },
    { homeTeam: 'Philadelphia Eagles', awayTeam: 'New York Giants' },
  ];

  const sunday = new Date();
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
  sunday.setHours(13, 0, 0, 0);

  for (const g of testGames) {
    await db.insert(games).values({
      leagueId,
      week,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      startTime: new Date(sunday),
    });
    sunday.setHours(sunday.getHours() + 3);
  }

  revalidatePath('/admin');
  revalidatePath('/pick');
}

export async function clearPicksForWeek(leagueId: string, week: number) {
  await requireAdmin();

  await db
    .delete(picks)
    .where(and(eq(picks.leagueId, leagueId), eq(picks.week, week)));

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/league');
}

export async function resetWeek(leagueId: string, week: number) {
  await requireAdmin();

  await db.delete(picks).where(and(eq(picks.leagueId, leagueId), eq(picks.week, week)));
  await db.delete(games).where(and(eq(games.leagueId, leagueId), eq(games.week, week)));
  await db.delete(weekConfig).where(and(eq(weekConfig.leagueId, leagueId), eq(weekConfig.week, week)));

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/league');
  revalidatePath('/pick');
}

function nextSaturdayMidnightNY(): Date {
  const now = new Date();
  const nyToday = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // "YYYY-MM-DD"
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })
  );
  const daysUntilSat = dow === 6 ? 7 : 6 - dow;
  const [y, m, d] = nyToday.split('-').map(Number);
  const sat = new Date(y, m - 1, d + daysUntilSat);
  const satStr = sat.toLocaleDateString('en-CA');

  // Determine UTC offset for America/New_York on that Saturday by sampling noon UTC
  const noonUTC = new Date(`${satStr}T12:00:00Z`);
  const nyHourAtNoon = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(noonUTC)
  );
  // midnight NY in UTC: UTC-4 (EDT) → 04:00 UTC, UTC-5 (EST) → 05:00 UTC
  const midnightNY = new Date(`${satStr}T00:00:00Z`);
  midnightNY.setUTCHours(12 - nyHourAtNoon);
  return midnightNY;
}

export async function createLeague(formData: FormData) {
  await requireAdmin();

  const name = formData.get('name') as string;
  const season = Number(formData.get('season'));
  const buyIn = formData.get('buyIn') as string;
  const venmoHandle = formData.get('venmoHandle') as string;

  if (!name || !season || !buyIn || !venmoHandle) {
    throw new Error('All fields are required.');
  }

  const [league] = await db.insert(leagues).values({ name, season, buyIn, venmoHandle }).returning();

  // Seed all 18 weeks of games from ESPN in parallel
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  const allWeekGames = await Promise.all(weeks.map((w) => fetchESPNGames(w, season)));

  const gamesToInsert = allWeekGames.flatMap((weekGames, i) =>
    weekGames.map((g) => ({
      leagueId: league.id,
      week: weeks[i],
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      startTime: g.startTime,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      winner: g.winner,
    }))
  );

  if (gamesToInsert.length > 0) {
    await db.insert(games).values(gamesToInsert);
  }

  console.log(`[createLeague] Seeded ${gamesToInsert.length} game(s) across 18 weeks for league "${name}" (${season})`);

  // Auto-configure week 1: open picks with deadline at next Saturday midnight NY
  const deadline = nextSaturdayMidnightNY();
  await db.insert(weekConfig).values({
    leagueId: league.id,
    week: 1,
    deadline,
    isOpen: true,
    isLocked: false,
  });

  redirect('/admin');
}

export async function deleteLeague(leagueId: string) {
  await requireAdmin();

  await db.update(leagues).set({ status: 'deleted' }).where(eq(leagues.id, leagueId));

  revalidatePath('/dashboard');
  redirect('/admin');
}

export async function completeLeague(leagueId: string) {
  await requireAdmin();

  await db.update(leagues).set({ status: 'completed' }).where(eq(leagues.id, leagueId));

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/league');
}

export async function getCompletedLeagues() {
  await requireAdmin();
  return db
    .select()
    .from(leagues)
    .where(eq(leagues.status, 'completed'))
    .orderBy(desc(leagues.season), desc(leagues.createdAt));
}

function csvCell(value: string): string {
  // Quote any cell containing a comma, quote, or newline (RFC 4180).
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a Hall of Fame CSV for a finished league. Columns:
 *   Name, Week 1, Week 2, …, Week N, Winner
 * Each week cell holds the full team name the player picked that week (blank
 * once they're eliminated). The Winner column is "X" for the last player(s)
 * standing. Returns the suggested filename plus the CSV text for download.
 */
export async function exportLeagueCsv(
  leagueId: string
): Promise<{ filename: string; content: string }> {
  await requireAdmin();

  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) throw new Error('League not found.');

  const members = await db
    .select({
      userId: leagueMembers.userId,
      name: users.name,
      phone: users.phone,
      isAlive: leagueMembers.isAlive,
      eliminatedWeek: leagueMembers.eliminatedWeek,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId))
    .orderBy(asc(users.name));

  const allPicks = await db
    .select()
    .from(picks)
    .where(eq(picks.leagueId, leagueId));

  const maxWeek = allPicks.reduce((m, p) => Math.max(m, p.week), 0);

  // Only members who actually made a pick are real participants.
  const pickCount = new Map<string, number>();
  for (const p of allPicks) pickCount.set(p.userId, (pickCount.get(p.userId) ?? 0) + 1);
  const participants = members.filter((m) => (pickCount.get(m.userId) ?? 0) > 0);

  // Winner(s) = participants still alive; if everyone was eliminated, the
  // player(s) who lasted the longest (latest elimination week).
  const survivors = participants.filter((m) => m.isAlive);
  let winnerIds: Set<string>;
  if (survivors.length > 0) {
    winnerIds = new Set(survivors.map((m) => m.userId));
  } else {
    const latest = participants.reduce((m, x) => Math.max(m, x.eliminatedWeek ?? 0), 0);
    winnerIds = new Set(
      participants.filter((m) => (m.eliminatedWeek ?? 0) === latest).map((m) => m.userId)
    );
  }

  const header = [
    'Name',
    ...Array.from({ length: maxWeek }, (_, i) => `Week ${i + 1}`),
    'Winner',
  ];

  const rows = participants.map((m) => {
    const cells = [m.name ?? m.phone ?? 'Unknown'];
    for (let w = 1; w <= maxWeek; w++) {
      const pick = allPicks.find((p) => p.userId === m.userId && p.week === w);
      cells.push(pick?.teamPicked ?? '');
    }
    cells.push(winnerIds.has(m.userId) ? 'X' : '');
    return cells;
  });

  const content = [header, ...rows]
    .map((cells) => cells.map(csvCell).join(','))
    .join('\r\n');

  const slug = league.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filename = `${league.season}-${slug || 'league'}.csv`;

  return { filename, content };
}
