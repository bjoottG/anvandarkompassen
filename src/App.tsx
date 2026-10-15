import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CaseRow, Filters, Perspective } from './lib/types';
import { EMPTY_FILTERS } from './lib/types';
import { parseWorkbook } from './lib/parse';
import { calculateKPIs, filterCases } from './lib/aggregate';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { PerspectiveView, type Selection } from './components/Perspectives';
import { CaseList } from './components/CaseList';
import { Upload } from './components/Upload';

const TABS: { id: Perspective; label: string; hint: string }[] = [
  { id: 'user', label: '1. Användare', hint: 'personal' },
  { id: 'org', label: '2. Beslutande org', hint: 'aktör' },
  { id: 'stod', label: '3. Stöd', hint: '' },
];

type Status = { kind: 'loading' } | { kind: 'empty'; error?: string } | { kind: 'ready'; source: string };

export default function App() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [perspective, setPerspective] = useState<Perspective>('user');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback((buf: ArrayBuffer, source: string) => {
    try {
      const rows = parseWorkbook(buf);
      if (!rows.length) throw new Error('Filen innehåller inga ärenderader.');
      setCases(rows);
      setFilters(EMPTY_FILTERS);
      setSelection(null);
      setStatus({ kind: 'ready', source });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus((s) => (s.kind === 'ready' ? s : { kind: 'empty', error: msg }));
      setToast(`Kunde inte läsa ${source}: ${msg}`);
      return false;
    }
  }, []);

  useEffect(() => {
    fetch('/default-data.xlsx')
      .then((r) => {
        const type = r.headers.get('content-type') ?? '';
        if (!r.ok || type.includes('text/html')) throw new Error('saknas');
        return r.arrayBuffer();
      })
      .then((buf) => load(buf, 'standardfilen'))
      .catch(() => setStatus({ kind: 'empty' }));
  }, [load]);

  const onFile = useCallback(
    async (file: File) => {
      if (load(await file.arrayBuffer(), file.name)) setToast(`Läste in ${file.name}`);
    },
    [load],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => filterCases(cases, filters), [cases, filters]);
  const kpis = useMemo(() => calculateKPIs(filtered, filters.roles), [filtered, filters.roles]);

  const changeFilters = (f: Filters) => {
    setFilters(f);
    setSelection(null);
  };

  const applyFilter = (patch: Partial<Filters>) => {
    changeFilters({ ...filters, ...patch });
  };

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="bg-header text-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Compass />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Användarkompassen</h1>
            <p className="text-sm text-white/75">Ärendeanalys per användare, beslutande org och stöd</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {status.kind === 'ready' && (
              <span className="text-sm text-white/75">
                Källa: {status.source} · {cases.length.toLocaleString('sv-SE')} rader
              </span>
            )}
            {status.kind === 'ready' && <Upload onFile={onFile} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
        {status.kind === 'loading' && <p className="py-20 text-center text-ink-muted">Läser in data…</p>}

        {status.kind === 'empty' && (
          <div className="mx-auto max-w-xl py-12">
            <Upload onFile={onFile} variant="hero">
              <h2 className="text-xl font-semibold">Ingen data inläst</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Ladda upp ärendefilen (t.ex. <code>Bok1_ifylld_1000_rader.xlsx</code>). Rubrikerna ska ligga på rad 2.
              </p>
              {status.error && <p className="mt-3 text-sm font-medium text-danger">{status.error}</p>}
            </Upload>
          </div>
        )}

        {status.kind === 'ready' && (
          <>
            <FilterBar cases={cases} filters={filters} onChange={changeFilters} />
            <KpiCards kpis={kpis} />

            <section className="space-y-4">
              <div role="tablist" aria-label="Perspektiv" className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1">
                {TABS.map((t) => {
                  const on = perspective === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={on}
                      onClick={() => setPerspective(t.id)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${on ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                    >
                      {t.label}
                      {t.hint && <span className="ml-1 font-normal opacity-75">({t.hint})</span>}
                    </button>
                  );
                })}
              </div>
              <div role="tabpanel">
                <PerspectiveView
                  perspective={perspective}
                  cases={filtered}
                  filters={filters}
                  selection={selection}
                  onSelect={setSelection}
                  onApplyFilter={applyFilter}
                />
              </div>
            </section>

            <CaseList cases={filtered} title="Ärendelista för aktuellt urval" />
          </>
        )}
      </main>

      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Compass() {
  return (
    <svg viewBox="0 0 32 32" className="h-10 w-10" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <path d="M16 5l4 11-4 11-4-11z" fill="#fff" />
      <path d="M16 5l4 11h-8z" fill="#f08a78" />
    </svg>
  );
}
