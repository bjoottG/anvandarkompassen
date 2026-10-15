import type { Kpis } from '../lib/types';
import { formatKr, formatNum } from '../lib/aggregate';

export function KpiCards({ kpis, compact = false }: { kpis: Kpis; compact?: boolean }) {
  const { handlaggare, ekonom, beslutsfattare } = kpis.roleBreakdown;
  const cards = [
    { label: 'Antal ärenden', value: formatNum(kpis.caseCount), sub: null },
    {
      label: 'Unika användare',
      value: formatNum(kpis.uniqueUsersCount),
      sub: `${formatNum(handlaggare)} handläggare · ${formatNum(ekonom)} ekonomer · ${formatNum(beslutsfattare)} beslutsfattare`,
    },
    { label: 'Nettobeviljat belopp', value: formatKr(kpis.totalGrantedAmount), sub: null },
  ];
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border border-line bg-surface ${compact ? 'p-3' : 'p-4 shadow-sm'}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{c.label}</div>
          <div className={`mt-1 font-semibold tabular-nums text-ink ${compact ? 'text-base' : 'text-3xl'}`}>{c.value}</div>
          {c.sub && <div className="mt-1 text-xs text-ink-muted">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
