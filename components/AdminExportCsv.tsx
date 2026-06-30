'use client';

import { useState } from 'react';
import { exportLeagueCsv } from '@/app/actions/admin';

interface Props {
  leagueId: string;
}

export function AdminExportCsv({ leagueId }: Props) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleDownload() {
    setIsBusy(true);
    try {
      const { filename, content } = await exportLeagueCsv(leagueId);
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export CSV.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isBusy}
      className="f-oswald"
      style={{
        fontWeight: 600,
        fontSize: '12px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: 'var(--ink)',
        border: '1.5px solid var(--ink)',
        borderRadius: '4px',
        padding: '8px 12px',
        background: 'transparent',
        cursor: isBusy ? 'not-allowed' : 'pointer',
        opacity: isBusy ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {isBusy ? 'Exporting…' : 'Download CSV'}
    </button>
  );
}
