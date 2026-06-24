import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getActiveLeague } from '@/app/actions/league';
import { CreateLeagueForm } from '@/components/CreateLeagueForm';

export default async function CreateLeaguePage() {
  await requireAdmin().catch(() => redirect('/dashboard'));

  const existing = await getActiveLeague();
  if (existing) redirect('/admin');

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create League</h1>
      <CreateLeagueForm />
    </main>
  );
}
