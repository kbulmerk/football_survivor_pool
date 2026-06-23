import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { leagueMembers, picks, weekConfig } from '@/lib/schema';
import { getActiveLeague } from '@/app/actions/league';
import { Countdown } from '@/components/Countdown';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const league = await getActiveLeague();

  if (!league) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Survivor Pool</h1>
        <p className="text-gray-500">No active league. Check back soon.</p>
      </main>
    );
  }

  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, league.id),
        eq(leagueMembers.userId, user.id)
      )
    );

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

  const currentWeek = config?.week ?? null;

  const myPick = currentWeek
    ? await db
        .select()
        .from(picks)
        .where(
          and(
            eq(picks.leagueId, league.id),
            eq(picks.userId, user.id),
            eq(picks.week, currentWeek)
          )
        )
        .then((rows) => rows[0] ?? null)
    : null;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
      <p className="text-gray-500 mb-6">Season {league.season}</p>

      {/* Status banner */}
      {member ? (
        <div
          className={`rounded-lg p-4 mb-6 font-semibold text-lg ${
            member.isAlive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {member.isAlive ? '✅ You are alive' : '❌ Eliminated'}
          {!member.isAlive && member.eliminatedWeek != null && (
            <span className="font-normal text-base ml-2">
              (Week {member.eliminatedWeek})
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-lg p-4 mb-6 bg-yellow-100 text-yellow-800 font-semibold">
          You have not joined this league yet.{' '}
          <Link href="/league" className="underline">
            View league
          </Link>
        </div>
      )}

      {/* Payment notice */}
      {member && !member.isPaid && (
        <div className="rounded-lg p-4 mb-6 bg-orange-100 text-orange-800">
          Your payment has not been confirmed.{' '}
          <Link href="/payment" className="underline font-semibold">
            Pay now →
          </Link>
        </div>
      )}

      {/* Current week */}
      {config && member?.isAlive && member?.isPaid && (
        <div className="rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Week {config.week}</h2>
            <Countdown deadline={config.deadline.toISOString()} />
          </div>

          {myPick ? (
            <p className="text-gray-700">
              Your pick:{' '}
              <span className="font-bold">{myPick.teamPicked}</span> to lose
            </p>
          ) : (
            <Link
              href="/pick"
              className="inline-block mt-2 rounded-full bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
            >
              Make your pick →
            </Link>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <Link href="/league" className="text-blue-600 underline text-sm">
          View standings
        </Link>
      </div>
    </main>
  );
}
