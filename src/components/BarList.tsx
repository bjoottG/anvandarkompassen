import { naturalCompare } from '../lib/aggregate';

interface Item {
  key: string;
  value: number;
}

interface Props {
  title: string;
  items: Item[];
  format: (n: number) => string;
  sortByLabel?: boolean;
}

/** Enkelt horisontellt stapeldiagram (en serie, en färg). */
export function BarList({ title, items, format, sortByLabel }: Props) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const sorted = [...items].sort(sortByLabel ? (a, b) => naturalCompare(a.key, b.key) : (a, b) => b.value - a.value);
  return (
    <figure>
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</figcaption>
      <ul className="space-y-1">
        {sorted.map((i) => (
          <li key={i.key} className="group grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm" title={`${i.key}: ${format(i.value)}`}>
            <span className="truncate text-ink">{i.key}</span>
            <span className="h-3 rounded-r bg-line/40">
              <span
                className="block h-3 rounded-r bg-accent transition-opacity group-hover:opacity-80"
                style={{ width: `${max ? (i.value / max) * 100 : 0}%` }}
              />
            </span>
            <span className="tabular-nums text-ink-muted">{format(i.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
