import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getActiveLeague } from '@/app/actions/league';
import { games, leagueMembers, users, weekConfig } from '@/lib/schema';
import { AdminUserRow } from '@/components/AdminUserRow';
import { AdminGameRow } from '@/components/AdminGameRow';
import { AdminWeekControls } from '@/components/AdminWeekControls';

export default async function AdminPage() {
  await requireAdmin().catch(() => redirect('/dashboard'));

  const league = await getActiveLeague();
  if (!league) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin</h1>
        <p className="text-gray-500">No active league.</p>
      </main>
    );
  }

  const members = await db
    .select({
      userId: leagueMembers.userId,
      isAlive: leagueMembers.isAlive,
      isPaid: leagueMembers.isPaid,
      eliminatedWeek: leagueMembers.eliminatedWeek,
      name: users.name,
      phone: users.phone,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, league.id))
    .orderBy(users.name);

  const [config] = await db
    .select()
    .from(weekConfig)
    .where(eq(weekConfig.leagueId, league.id))
    .orderBy(weekConfig.week)
    .limit(1);

  const weekGames = config
    ? await db
        .select()
        .from(games)
        .where(
          and(eq(games.leagueId, league.id), eq(games.week, config.week))
        )
        .orderBy(games.startTime)
    : [];

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin — {league.name}</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Week Controls</h2>
        <AdminWeekControls leagueId={league.id} currentConfig={config ?? null} />
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">
          Week {config?.week ?? '?'} Games
        </h2>
        {weekGames.length === 0 ? (
          <p className="text-gray-500 text-sm">No games loaded for this week.</p>
        ) : (
          <div className="divide-y border rounded-lg overflow-hidden">
            {weekGames.map((game) => (
              <AdminGameRow key={game.id} game={game} leagueId={league.id} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Members</h2>
        <div className="divide-y border rounded-lg overflow-hidden">
          {members.map((member) => (
            <AdminUserRow
              key={member.userId}
              member={member}
              leagueId={league.id}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
