import { useMemo, useState, type ReactNode } from 'react';
import { naturalCompare } from '../lib/aggregate';

export interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => number | string;
  render?: (row: T) => ReactNode;
  numeric?: boolean;
  /** Visa en fördelningsstapel (andel av största värdet i kolumnen). */
  bar?: boolean;
  headerTitle?: string;
  cellTitle?: (row: T) => string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  selectedKey?: string | null;
  onRowClick?: (row: T) => void;
  maxHeight?: string;
  emptyText?: string;
  caption?: string;
  rowClassName?: (row: T) => string;
  /** Tätare layout för detaljpanelen. */
  compact?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  selectedKey,
  onRowClick,
  maxHeight = '32rem',
  emptyText = 'Inga rader matchar urvalet.',
  caption,
  rowClassName,
  compact = false,
}: Props<T>) {
  const px = compact ? 'px-2' : 'px-3';
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 'asc' as const });

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : naturalCompare(String(va), String(vb));
      return cmp * factor;
    });
  }, [rows, columns, sort]);

  const maxima = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of columns) {
      if (c.bar) m[c.key] = Math.max(0, ...rows.map((r) => Number(c.value(r)) || 0));
    }
    return m;
  }, [rows, columns]);

  const toggleSort = (key: string, numeric?: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: numeric ? 'desc' : 'asc' }));

  return (
    <div className="overflow-auto rounded-lg border border-line bg-surface" style={{ maxHeight }}>
      <table className={`w-full border-collapse ${compact ? 'text-[13px]' : 'text-sm'}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`border-b border-line ${px} py-2 font-semibold text-ink ${c.numeric ? 'text-right' : 'text-left'}`}
                  title={c.headerTitle}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key, c.numeric)}
                    className={`inline-flex items-center gap-1 text-balance hover:text-accent ${c.numeric ? 'flex-row-reverse text-right' : 'text-left'}`}
                  >
                    {c.label}
                    <span aria-hidden className={`text-xs ${active ? 'text-accent' : 'text-ink-muted/50'}`}>
                      {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-ink-muted">
                {emptyText}
              </td>
            </tr>
          )}
          {sorted.map((r) => {
            const k = rowKey(r);
            const selected = selectedKey === k;
            return (
              <tr
                key={k}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(r);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                aria-selected={onRowClick ? selected : undefined}
                className={`border-b border-line/70 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-accent-soft/60 focus:outline-2 focus:-outline-offset-2 focus:outline-accent' : ''} ${selected ? 'bg-accent-soft' : ''} ${rowClassName?.(r) ?? ''}`}
              >
                {columns.map((c) => {
                  const v = c.value(r);
                  const content = c.render ? c.render(r) : v;
                  const max = maxima[c.key];
                  const pct = c.bar && max ? (Number(v) / max) * 100 : 0;
                  return (
                    <td
                      key={c.key}
                      className={`${px} py-1.5 align-middle ${c.numeric ? 'text-right tabular-nums' : ''}`}
                      title={c.cellTitle?.(r)}
                    >
                      {c.bar ? (
                        <div className={`flex flex-col items-end gap-1 ${compact ? 'min-w-16' : 'min-w-28'}`}>
                          <span>{content}</span>
                          <span className="block h-1 w-full rounded-full bg-line/60" aria-hidden>
                            <span className="block h-1 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                          </span>
                        </div>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
