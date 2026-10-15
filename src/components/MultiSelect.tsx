import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

export interface QuickPick {
  label: string;
  values: string[];
}

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  quickPicks?: QuickPick[];
  placeholder?: string;
  renderOption?: (o: string) => ReactNode;
  /** Begränsa antalet renderade alternativ (för långa listor). */
  limit?: number;
}

export function MultiSelect({ label, options, selected, onChange, quickPicks, placeholder = 'Alla', renderOption, limit = 200 }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const sel = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  const toggle = (o: string) => onChange(sel.has(o) ? selected.filter((s) => s !== o) : [...selected, o]);

  const summary =
    selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} valda`;

  return (
    <div className="relative" ref={ref}>
      <span id={`${id}-l`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-sm hover:border-accent focus:outline-2 focus:outline-accent"
      >
        <span className={`truncate ${selected.length ? 'font-medium text-ink' : 'text-ink-muted'}`}>{summary}</span>
        <span aria-hidden className="text-ink-muted">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 rounded-md border border-line bg-surface p-2 shadow-lg">
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök…"
            className="mb-2 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm focus:outline-2 focus:outline-accent"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            <button type="button" onClick={() => onChange([])} className="chip-btn">
              Alla
            </button>
            {quickPicks?.map((p) => (
              <button key={p.label} type="button" onClick={() => onChange(p.values)} className="chip-btn">
                {p.label}
              </button>
            ))}
            {q && filtered.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([...new Set([...selected, ...filtered])])}
                className="chip-btn"
              >
                Välj sökträffar ({filtered.length})
              </button>
            )}
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-auto">
            {filtered.slice(0, limit).map((o) => (
              <li key={o}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent-soft">
                  <input type="checkbox" checked={sel.has(o)} onChange={() => toggle(o)} className="accent-accent" />
                  {renderOption ? renderOption(o) : o}
                </label>
              </li>
            ))}
            {filtered.length > limit && (
              <li className="px-2 py-1 text-xs text-ink-muted">
                Visar {limit} av {filtered.length} – förfina sökningen.
              </li>
            )}
            {filtered.length === 0 && <li className="px-2 py-1 text-sm text-ink-muted">Inga träffar</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
