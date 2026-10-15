import * as XLSX from 'xlsx';
import type { CaseRow } from './types';

const norm = (s: unknown) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

const num = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? '').replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Hittar kolumnindex för varje fält utifrån rubrikraden. */
function mapColumns(header: unknown[]) {
  const h = header.map(norm);
  const find = (pred: (c: string) => boolean) => h.findIndex(pred);
  return {
    nr: find((c) => c === 'nr'),
    arendeId: find((c) => c.replace(/\s/g, '') === 'ärendeid' || c === 'ärende id' || c === 'arendeid'),
    org: find((c) => c.startsWith('beslutande org')),
    handlaggare: find((c) => c.includes('handläggare') || c.includes('handlaggare')),
    ekonom: find((c) => c === 'ekonom'),
    hanterasAv: find((c) => c.startsWith('hanteras av')),
    beslutsfattare: find((c) => c.startsWith('beslutsfattare')),
    belopp: find((c) => c.startsWith('netto')),
    stod: find((c) => c === 'stöd' || c === 'stod'),
  };
}

/**
 * Läser en arbetsbok. Rubrikraden förväntas på rad 2 men letas upp bland de
 * första raderna (raden som innehåller "ärendeid") för robusthet.
 */
export function parseWorkbook(data: ArrayBuffer): CaseRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });

  const headerIdx = rows.slice(0, 10).findIndex((r) => r.some((c) => norm(c).replace(/\s/g, '') === 'ärendeid'));
  if (headerIdx < 0) throw new Error('Hittade ingen rubrikrad med kolumnen "ärendeid" bland de första raderna.');

  const col = mapColumns(rows[headerIdx]);
  const required: (keyof typeof col)[] = ['arendeId', 'org', 'handlaggare', 'ekonom', 'beslutsfattare', 'belopp', 'stod'];
  const missing = required.filter((k) => col[k] < 0);
  if (missing.length) throw new Error(`Saknade kolumner i filen: ${missing.join(', ')}`);

  const get = (r: unknown[], i: number) => (i < 0 ? '' : r[i]);
  const out: CaseRow[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const arendeId = num(get(r, col.arendeId));
    if (!arendeId) continue;
    out.push({
      nr: num(get(r, col.nr)),
      arendeId,
      org: str(get(r, col.org)),
      handlaggare: str(get(r, col.handlaggare)),
      ekonom: str(get(r, col.ekonom)),
      hanterasAv: str(get(r, col.hanterasAv)),
      beslutsfattare: str(get(r, col.beslutsfattare)),
      belopp: num(get(r, col.belopp)),
      stod: str(get(r, col.stod)),
    });
  }
  return out;
}
