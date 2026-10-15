import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { CaseRow } from '../lib/types';
import { formatKr, formatNum } from '../lib/aggregate';
import { DataTable, type Column } from './DataTable';

const columns: Column<CaseRow>[] = [
  { key: 'arendeId', label: 'Ärende-ID', numeric: true, value: (r) => r.arendeId },
  { key: 'org', label: 'Beslutande org', value: (r) => r.org },
  { key: 'handlaggare', label: 'Ansvarig handläggare', value: (r) => r.handlaggare },
  { key: 'ekonom', label: 'Ekonom', value: (r) => r.ekonom },
  {
    key: 'beslutsfattare',
    label: 'Beslutsfattare',
    value: (r) => r.beslutsfattare,
    render: (r) => r.beslutsfattare || <span className="text-ink-muted">–</span>,
  },
  { key: 'belopp', label: 'Nettobeviljat belopp', numeric: true, value: (r) => r.belopp, render: (r) => formatKr(r.belopp) },
  { key: 'stod', label: 'Stöd', value: (r) => r.stod },
];

export function CaseList({ cases, title }: { cases: CaseRow[]; title: string }) {
  const [open, setOpen] = useState(false);

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(
      cases.map((c) => ({
        ärendeid: c.arendeId,
        'beslutande org': c.org,
        'ansvarig handläggare': c.handlaggare,
        ekonom: c.ekonom,
        beslutsfattare: c.beslutsfattare,
        'nettobeviljat belopp': c.belopp,
        stöd: c.stod,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Urval');
    XLSX.writeFile(wb, 'anvandarkompassen-urval.xlsx');
  };

  return (
    <section className="rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left text-lg font-semibold text-ink hover:text-accent"
        >
          <span aria-hidden className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          {title} <span className="text-base font-normal text-ink-muted">({formatNum(cases.length)} ärenden)</span>
        </button>
        <button type="button" onClick={exportXlsx} disabled={!cases.length} className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50">
          Exportera urval (.xlsx)
        </button>
      </div>
      {open && (
        <div className="border-t border-line p-4">
          <DataTable<CaseRow>
            caption="Ärenderader"
            rows={cases}
            columns={columns}
            rowKey={(r) => String(r.arendeId) + '-' + r.nr}
            initialSort={{ key: 'arendeId', dir: 'asc' }}
            maxHeight="36rem"
          />
        </div>
      )}
    </section>
  );
}
