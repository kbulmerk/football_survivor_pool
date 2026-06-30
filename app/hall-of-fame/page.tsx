import { listSeasons, getSeasonData } from '@/lib/hall-of-fame';
import { HallOfFameSelector } from '@/components/HallOfFameSelector';
import { HallOfFameBoard } from '@/components/HallOfFameBoard';

export const dynamic = 'force-dynamic';

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const seasons = await listSeasons();

  if (seasons.length === 0) {
    return (
      <main style={{ padding: '22px 20px 16px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '30px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginBottom: '12px' }}>
          Hall of Fame
        </h1>
        <p className="f-spectral" style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: 1.45 }}>
          No past seasons on record yet. Once a league wraps, its results CSV gets added to the archive and will show up here.
        </p>
      </main>
    );
  }

  const selectedFile = seasons.find((s) => s.file === season)?.file ?? seasons[0].file;
  const data = await getSeasonData(selectedFile);
  const winners = data?.winners ?? [];

  return (
    <main style={{ padding: '22px 20px 16px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '13px' }}>
        <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
          {String(seasons.length).padStart(2, '0')} SEASONS ON RECORD
        </div>
        <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '36px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.92, marginTop: '3px' }}>
          Hall of Fame
        </h1>
      </div>

      {/* Season selector */}
      <HallOfFameSelector seasons={seasons} selected={selectedFile} />

      {!data ? (
        <p className="f-spectral" style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '16px' }}>
          Couldn&apos;t read this season&apos;s results file.
        </p>
      ) : (
        <>
          {/* Winner banner */}
          <div
            style={{
              marginTop: '16px',
              background: 'var(--ink)',
              border: '1.5px solid var(--ink)',
              borderRadius: '6px',
              boxShadow: '4px 4px 0 rgba(34,26,16,0.18)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '7px 14px', background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2.5px', color: 'var(--gold)', textTransform: 'uppercase' }}>
                🏆 Champion
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <div className="f-oswald" style={{ fontWeight: 700, fontSize: '28px', letterSpacing: '0.5px', color: '#FBF5E6', textTransform: 'uppercase', lineHeight: 1 }}>
                {winners.length > 0 ? winners.join(' · ') : 'Undecided'}
              </div>
              <p className="f-spectral" style={{ fontStyle: 'italic', fontSize: '13px', color: '#bcae8f', marginTop: '5px' }}>
                Last team standing in the {seasons.find((s) => s.file === selectedFile)?.label} pool.
              </p>
            </div>
          </div>

          {/* Standings / pick history */}
          <div style={{ padding: '22px 0 13px' }}>
            <span className="section-heading">Standings</span>
          </div>
          <HallOfFameBoard rows={data.rows} weeks={data.weeks} />
        </>
      )}
    </main>
  );
}
