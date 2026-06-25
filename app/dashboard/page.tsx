import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { leagueMembers, picks, weekConfig } from '@/lib/schema';
import { getAllLeagues } from '@/app/actions/league';
import { autoAssignOnDeadlinePass } from '@/lib/survivor-rules';
import { Countdown } from '@/components/Countdown';
import { JoinLeagueButton } from '@/components/JoinLeagueButton';
import { UnpaidPickButton } from '@/components/UnpaidPickButton';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const allLeagues = await getAllLeagues();

  if (allLeagues.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Survivor Pool</h1>
        <p className="text-gray-500">No active league. Check back soon.</p>
      </main>
    );
  }

  const leagueData = await Promise.all(
    allLeagues.map(async (league) => {
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
            eq(weekConfig.isOpen, true)
          )
        )
        .orderBy(desc(weekConfig.week))
        .limit(1);

      if (config && !config.isLocked && new Date() > config.deadline) {
        await autoAssignOnDeadlinePass(league.id, config.week);
      }

      const currentWeek = config?.week ?? null;
      const isLocked = config ? (config.isLocked || new Date() > config.deadline) : false;

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

      return { league, member: member ?? null, config: config ?? null, isLocked, myPick };
    })
  );

  const btnClass =
    'rounded-full bg-blue-600 px-5 py-2 text-white font-semibold hover:bg-blue-700 text-sm text-center';
  const disabledBtnClass =
    'rounded-full bg-gray-200 px-5 py-2 text-gray-400 font-semibold text-sm text-center cursor-not-allowed';

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Leagues</h1>

      <div className="flex flex-col gap-10">
        {leagueData.map(({ league, member, config, isLocked, myPick }) => (
          <div key={league.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{league.name}</h2>
              <p className="text-gray-500 text-sm">Season {league.season}</p>
            </div>

            {/* Status banner */}
            {member ? (
              <div
                className={`rounded-lg p-3 mb-4 font-semibold ${
                  member.isAlive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {member.isAlive ? '✅ You are alive' : '❌ Eliminated'}
                {!member.isAlive && member.eliminatedWeek != null && (
                  <span className="font-normal text-sm ml-2">
                    (Week {member.eliminatedWeek})
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-lg p-3 mb-4 bg-yellow-100 text-yellow-800 font-semibold flex items-center justify-between flex-wrap gap-3">
                <span>You have not joined this league yet.</span>
                <JoinLeagueButton leagueId={league.id} hasPhone={!!user.phone} />
              </div>
            )}

            {/* Payment notice */}
            {member && !member.isPaid && (
              <div className="rounded-lg p-3 mb-4 bg-orange-100 text-orange-800 text-sm">
                Your payment has not been confirmed.{' '}
                <Link href="/payment" className="underline font-semibold">
                  Pay now →
                </Link>
              </div>
            )}

            {/* Current week info */}
            {config && member?.isAlive && member?.isPaid && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Week {config.week}</h3>
                  <Countdown deadline={config.deadline.toISOString()} />
                </div>
                {myPick ? (
                  <p className="text-gray-700 text-sm">
                    Your pick: <span className="font-bold">{myPick.teamPicked}</span> to lose
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">No pick made yet for this week.</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <Link href={`/league?leagueId=${league.id}`} className={btnClass}>View Standings</Link>
              {isLocked || !member || !member.isAlive ? (
                <span className={disabledBtnClass}>
                  {myPick ? 'Edit Pick' : 'Add Pick'}
                </span>
              ) : !member.isPaid ? (
                <UnpaidPickButton
                  label={myPick ? 'Edit Pick' : 'Add Pick'}
                  venmoHandle={league.venmoHandle}
                  buyIn={String(league.buyIn)}
                />
              ) : (
                <Link href={`/pick?leagueId=${league.id}`} className={btnClass}>
                  {myPick ? 'Edit Pick' : 'Add Pick'}
                </Link>
              )}
              {member?.isPaid ? (
                <span className={disabledBtnClass}>Make Payment</span>
              ) : (
                <Link href="/payment" className={btnClass}>Make Payment</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
