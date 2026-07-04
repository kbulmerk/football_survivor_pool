import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { CreateLeagueTypeToggle } from '@/components/CreateLeagueTypeToggle';

export default async function CreateLeaguePage() {
  await requireAdmin().catch(() => redirect('/dashboard'));

  return (
    <main style={{ padding: '22px 20px 60px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <div className="f-mono" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase', marginBottom: '5px' }}>
        ADMIN · NEW LEAGUE
      </div>
      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '46px', letterSpacing: '-0.5px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginBottom: '28px' }}>
        Create League
      </h1>
      <CreateLeagueTypeToggle />
    </main>
  );
}
