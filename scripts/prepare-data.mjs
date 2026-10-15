// Kopierar första .xlsx-filen i data/ till public/default-data.xlsx så att
// appen kan läsa in den automatiskt vid start.
import { copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = 'data';
const target = join('public', 'default-data.xlsx');

const preferred = 'Bok1_ifylld_1000_rader.xlsx';
const files = existsSync(dataDir)
  ? readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'))
  : [];
const source = files.includes(preferred) ? preferred : files.sort()[0];

if (source) {
  copyFileSync(join(dataDir, source), target);
  console.log(`[prepare-data] ${source} -> ${target}`);
} else {
  if (existsSync(target)) rmSync(target);
  console.warn('[prepare-data] Ingen .xlsx-fil i data/ – appen startar utan standarddata.');
}
