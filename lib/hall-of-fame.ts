import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

// Directory (committed to the repo) holding one CSV per completed season.
// Filenames drive the season dropdown, e.g. "2024-bulmer-survivor.csv".
const HALL_OF_FAME_DIR = path.join(process.cwd(), 'data', 'hall-of-fame');

export interface SeasonFile {
  /** Raw filename including extension, used as the dropdown value. */
  file: string;
  /** Human-readable label derived from the filename. */
  label: string;
}

export interface HallOfFameRow {
  name: string;
  /** One entry per week column; null where the player had no pick. */
  picks: (string | null)[];
  isWinner: boolean;
  /** Last week the player made a pick (their elimination week), or null. */
  eliminatedWeek: number | null;
  /** Count of weeks survived (non-empty picks). */
  survived: number;
}

export interface SeasonData {
  weeks: number;
  rows: HallOfFameRow[];
  winners: string[];
}

function labelFromFilename(file: string): string {
  return file
    .replace(/\.csv$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function listSeasons(): Promise<SeasonFile[]> {
  let files: string[];
  try {
    files = await fs.readdir(HALL_OF_FAME_DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .sort()
    .reverse()
    .map((f) => ({ file: f, label: labelFromFilename(f) }));
}

// Minimal CSV line splitter with RFC-4180 quote handling. Falls back to tabs
// when the line is tab-delimited (some exports are TSV).
function splitLine(line: string): string[] {
  if (line.includes('\t') && !line.includes(',')) return line.split('\t');

  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export async function getSeasonData(file: string): Promise<SeasonData | null> {
  // Guard against path traversal — only plain filenames in the data dir.
  if (!file.toLowerCase().endsWith('.csv') || file.includes('/') || file.includes('\\') || file.includes('..')) {
    return null;
  }

  let text: string;
  try {
    text = await fs.readFile(path.join(HALL_OF_FAME_DIR, file), 'utf8');
  } catch {
    return null;
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const header = splitLine(lines[0]);
  const weekCount = header.filter((h) => /^week/i.test(h)).length;
  const winnerIdx = header.findIndex((h) => /winner/i.test(h));

  const rows: HallOfFameRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    const name = cells[0] ?? '';
    if (!name) continue;

    const picks: (string | null)[] = [];
    let eliminatedWeek: number | null = null;
    let survived = 0;
    for (let w = 0; w < weekCount; w++) {
      const value = cells[1 + w] ?? '';
      if (value) {
        picks.push(value);
        eliminatedWeek = w + 1;
        survived++;
      } else {
        picks.push(null);
      }
    }

    const winnerCell = winnerIdx >= 0 ? (cells[winnerIdx] ?? '') : '';
    const isWinner = winnerCell.length > 0;
    rows.push({ name, picks, isWinner, eliminatedWeek: isWinner ? null : eliminatedWeek, survived });
  }

  // Explicitly flagged winners; if none are flagged, fall back to whoever
  // lasted the longest (most weeks survived).
  let winners = rows.filter((r) => r.isWinner).map((r) => r.name);
  if (winners.length === 0 && rows.length > 0) {
    const deepest = Math.max(...rows.map((r) => r.survived));
    const champs = rows.filter((r) => r.survived === deepest);
    for (const r of champs) {
      r.isWinner = true;
      r.eliminatedWeek = null;
    }
    winners = champs.map((r) => r.name);
  }

  return { weeks: weekCount, rows, winners };
}
