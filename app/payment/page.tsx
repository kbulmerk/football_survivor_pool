import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getActiveLeague } from '@/app/actions/league';
import { leagueMembers } from '@/lib/schema';

export default async function PaymentPage() {
  const user = await getCurrentUser();
  const league = await getActiveLeague();

  if (!league) {
    return (
      <main className="p-8 max-w-xl mx-auto">
        <p className="text-gray-500">No active league found.</p>
      </main>
    );
  }

  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id))
    );

  const buyIn = Number(league.buyIn);
  const handle = league.venmoHandle.replace(/^@/, '');
  const venmoUrl = `https://venmo.com/${handle}?txn=pay&amount=${buyIn}&note=${encodeURIComponent(`Survivor Pool ${league.season}`)}`;

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pay Your Buy-In</h1>

      {member?.isPaid ? (
        <div className="rounded-lg p-4 bg-green-100 text-green-800 font-semibold mb-6">
          ✅ Your payment has been confirmed. You&apos;re all set!
        </div>
      ) : (
        <div className="rounded-lg p-4 bg-yellow-50 border border-yellow-200 mb-6">
          <p className="text-gray-700 mb-4">
            Send <strong>${buyIn}</strong> to{' '}
            <strong>{league.venmoHandle}</strong> on Venmo with the note{' '}
            <em>Survivor Pool {league.season}</em>.
          </p>
          <a
            href={venmoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-700"
          >
            Open Venmo →
          </a>
          <p className="text-sm text-gray-500 mt-4">
            After paying, the admin will confirm your payment and you&apos;ll be able to make picks.
          </p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
