import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getActiveLeague } from '@/app/actions/league';
import { games, leagueMembers, users, weekConfig } from '@/lib/schema';
import { AdminUserRow } from '@/components/AdminUserRow';
import { AdminGameRow } from '@/components/AdminGameRow';
import { AdminWeekControls } from '@/components/AdminWeekControls';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireAdmin().catch(() => redirect('/dashboard'));

  const league = await getActiveLeague();
  if (!league) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin</h1>
        <p className="text-gray-500 mb-4">No active league.</p>
        <Link
          href="/admin/create-league"
          className="inline-block bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700"
        >
          Create League
        </Link>
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

  const allConfigs = await db
    .select()
    .from(weekConfig)
    .where(eq(weekConfig.leagueId, league.id))
    .orderBy(weekConfig.week);

  const { week: weekParam } = await searchParams;
  const defaultWeek =
    allConfigs.length > 0 ? Math.max(...allConfigs.map((c) => c.week)) : 1;
  const selectedWeek = weekParam ? Number(weekParam) : defaultWeek;

  const currentConfig = allConfigs.find((c) => c.week === selectedWeek) ?? null;

  const weekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, league.id), eq(games.week, selectedWeek)))
    .orderBy(games.startTime);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin — {league.name}</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Week Controls</h2>
        <AdminWeekControls
          leagueId={league.id}
          currentConfig={currentConfig}
          allConfigs={allConfigs}
          selectedWeek={selectedWeek}
        />
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">
          Week {selectedWeek} Games
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

      <div className="mt-10 pt-6 border-t border-gray-200">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
