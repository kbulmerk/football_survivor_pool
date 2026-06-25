import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getAllLeagues } from '@/app/actions/league';
import { games, leagueMembers, users, weekConfig } from '@/lib/schema';
import { AdminUserRow } from '@/components/AdminUserRow';
import { AdminGameRow } from '@/components/AdminGameRow';
import { AdminWeekControls } from '@/components/AdminWeekControls';
import { AdminLeagueSelector } from '@/components/AdminLeagueSelector';
import { AdminDeleteLeague } from '@/components/AdminDeleteLeague';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; league?: string }>;
}) {
  await requireAdmin().catch(() => redirect('/dashboard'));

  const allLeagues = await getAllLeagues();
  if (allLeagues.length === 0) {
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

  const { week: weekParam, league: leagueParam } = await searchParams;
  const league =
    (leagueParam ? allLeagues.find((l) => l.id === leagueParam) : null) ??
    allLeagues[0];

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

  const openConfig = allConfigs.find((c) => c.isOpen && !c.isLocked);
  const defaultWeek =
    openConfig?.week ??
    (allConfigs.length > 0 ? Math.max(...allConfigs.map((c) => c.week)) : 1);
  const selectedWeek = weekParam ? Number(weekParam) : defaultWeek;

  const currentConfig = allConfigs.find((c) => c.week === selectedWeek) ?? null;

  const weekGames = await db
    .select()
    .from(games)
    .where(and(eq(games.leagueId, league.id), eq(games.week, selectedWeek)))
    .orderBy(games.startTime);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-end gap-4">
          <h1 className="text-2xl font-bold">Admin</h1>
          {allLeagues.length > 1 && (
            <AdminLeagueSelector
              leagues={allLeagues}
              selectedLeagueId={league.id}
            />
          )}
          {allLeagues.length === 1 && (
            <span className="text-lg text-gray-600">{league.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/create-league"
            className="text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
          >
            New League
          </Link>
          <AdminDeleteLeague leagueId={league.id} leagueName={league.name} />
        </div>
      </div>

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
              <AdminGameRow key={game.id} game={game} />
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
              currentWeek={selectedWeek}
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
