import { useMemo, useState, type ReactNode } from 'react';
import type { CaseRow, Filters, GroupRow, Perspective, Role, UserRow } from '../lib/types';
import { ROLE_LABEL } from '../lib/types';
import {
  calculateKPIs,
  formatKr,
  formatNum,
  groupByOrg,
  groupBySupport,
  groupByUser,
  isRegion,
  usersOf,
} from '../lib/aggregate';
import { DataTable } from './DataTable';
import { avgColumn, groupColumns, shareColumn, userColumns } from './columns';
import { KpiCards } from './KpiCards';
import { BarList } from './BarList';

export const REGIONS_KEY = '__regions__';
const REGIONS_LABEL = 'Regioner (totalt)';

export interface Selection {
  perspective: Perspective;
  key: string;
}

interface Props {
  perspective: Perspective;
  cases: CaseRow[]; // redan filtrerade
  filters: Filters;
  selection: Selection | null;
  onSelect: (s: Selection | null) => void;
  onApplyFilter: (patch: Partial<Filters>) => void;
}

/** Ärenden som hör till en vald rad. */
export function casesForSelection(cases: CaseRow[], s: Selection): CaseRow[] {
  switch (s.perspective) {
    case 'user': {
      const [role, user] = splitUserKey(s.key);
      return cases.filter((c) => usersOf(c).some((u) => u.user === user && u.role === role));
    }
    case 'org':
      return s.key === REGIONS_KEY ? cases.filter((c) => isRegion(c.org)) : cases.filter((c) => c.org === s.key);
    case 'stod':
      return cases.filter((c) => c.stod === s.key);
  }
}

const splitUserKey = (k: string) => {
  const i = k.indexOf('|');
  return [k.slice(0, i) as Role, k.slice(i + 1)] as const;
};

export function PerspectiveView({ perspective, cases, filters, selection, onSelect, onApplyFilter }: Props) {
  const active = selection?.perspective === perspective ? selection : null;
  const toggle = (key: string) => onSelect(active?.key === key ? null : { perspective, key });

  const main =
    perspective === 'user' ? (
      <UserMain cases={cases} filters={filters} selectedKey={active?.key ?? null} onRowClick={toggle} />
    ) : perspective === 'org' ? (
      <OrgMain cases={cases} roles={filters.roles} selectedKey={active?.key ?? null} onRowClick={toggle} />
    ) : (
      <StodMain cases={cases} roles={filters.roles} selectedKey={active?.key ?? null} onRowClick={toggle} />
    );

  return (
    <div className={`grid gap-4 ${active ? 'xl:grid-cols-2' : ''}`}>
      <div className="min-w-0">
        {main}
        {!active && (
          <p className="mt-2 text-sm text-ink-muted">
            Klicka på en rad för att se hur den fördelar sig på de andra perspektiven.
          </p>
        )}
      </div>
      {active && (
        <DetailPanel
          selection={active}
          cases={casesForSelection(cases, active)}
          roles={filters.roles}
          onClose={() => onSelect(null)}
          onApplyFilter={onApplyFilter}
        />
      )}
    </div>
  );
}

/* ---------- Huvudtabeller ---------- */

function UserMain({
  cases,
  filters,
  selectedKey,
  onRowClick,
}: {
  cases: CaseRow[];
  filters: Filters;
  selectedKey: string | null;
  onRowClick: (k: string) => void;
}) {
  const [q, setQ] = useState('');
  const [roleQuick, setRoleQuick] = useState<Role | 'all'>('all');
  const [includeColleagues, setIncludeColleagues] = useState(false);

  const all = useMemo(() => groupByUser(cases, filters.roles), [cases, filters.roles]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const chosen = new Set(filters.users);
    return all.filter(
      (r) =>
        (roleQuick === 'all' || r.role === roleQuick) &&
        (!needle || r.user.toLowerCase().includes(needle) || r.org.toLowerCase().includes(needle)) &&
        (!chosen.size || includeColleagues || chosen.has(r.user)),
    );
  }, [all, q, roleQuick, includeColleagues, filters.users]);

  const columns = useMemo(() => userColumns(), []);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök användare eller org…"
          aria-label="Sök i tabellen"
          className="w-56 rounded-md border border-line bg-surface px-3 py-1.5 text-sm focus:outline-2 focus:outline-accent"
        />
        <div role="group" aria-label="Snabbfilter roll" className="inline-flex overflow-hidden rounded-md border border-line">
          {(['all', 'handlaggare', 'ekonom', 'beslutsfattare'] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={roleQuick === r}
              onClick={() => setRoleQuick(r)}
              className={`border-r border-line px-2.5 py-1.5 text-sm last:border-0 ${roleQuick === r ? 'bg-accent text-white' : 'bg-surface hover:bg-accent-soft'}`}
            >
              {r === 'all' ? 'Alla roller' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        {filters.users.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeColleagues} onChange={(e) => setIncludeColleagues(e.target.checked)} className="accent-accent" />
            Visa även kollegor i samma ärenden
          </label>
        )}
        <span className="ml-auto text-sm text-ink-muted">{formatNum(rows.length)} användare</span>
      </div>
      <DataTable<UserRow>
        caption="Användare"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        initialSort={{ key: 'caseCount', dir: 'desc' }}
        selectedKey={selectedKey}
        onRowClick={(r) => onRowClick(r.key)}
        maxHeight="36rem"
      />
    </div>
  );
}

function OrgMain({
  cases,
  roles,
  selectedKey,
  onRowClick,
}: {
  cases: CaseRow[];
  roles: Role[];
  selectedKey: string | null;
  onRowClick: (k: string) => void;
}) {
  const [groupRegions, setGroupRegions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const total = useMemo(() => cases.reduce((s, c) => s + c.belopp, 0), [cases]);
  const all = useMemo(() => groupByOrg(cases, roles), [cases, roles]);
  const regionRows = useMemo(() => all.filter((r) => isRegion(r.key)), [all]);

  const rows = useMemo(() => {
    if (!groupRegions || regionRows.length === 0) return all;
    const regionCases = cases.filter((c) => isRegion(c.org));
    return [...all.filter((r) => !isRegion(r.key)), { key: REGIONS_KEY, ...calculateKPIs(regionCases, roles) }];
  }, [all, regionRows, groupRegions, cases, roles]);

  const columns = useMemo(() => {
    const cols = groupColumns('Beslutande org (aktör)', [shareColumn(total)]);
    cols[0] = {
      ...cols[0],
      value: (r: GroupRow) => (r.key === REGIONS_KEY ? REGIONS_LABEL : r.key),
      render: (r: GroupRow) =>
        r.key === REGIONS_KEY ? (
          <span className="inline-flex items-center gap-2 font-semibold">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Dölj regioner' : 'Visa regioner'}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              className="grid h-5 w-5 place-items-center rounded border border-line text-xs hover:border-accent"
            >
              {expanded ? '−' : '+'}
            </button>
            {REGIONS_LABEL} ({regionRows.length})
          </span>
        ) : (
          <span className="font-medium">{r.key}</span>
        ),
    };
    return cols;
  }, [total, expanded, regionRows.length]);

  const regionColumns = useMemo(() => groupColumns('Region', [shareColumn(total)]), [total]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={groupRegions} onChange={(e) => setGroupRegions(e.target.checked)} className="accent-accent" />
          Gruppera alla regioner till "{REGIONS_LABEL}"
        </label>
        <span className="ml-auto text-sm text-ink-muted">{all.length} aktörer</span>
      </div>
      <DataTable<GroupRow>
        caption="Beslutande org"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        initialSort={{ key: 'totalGrantedAmount', dir: 'desc' }}
        selectedKey={selectedKey}
        onRowClick={(r) => onRowClick(r.key)}
        rowClassName={(r) => (r.key === REGIONS_KEY ? 'bg-surface-muted/60' : '')}
      />
      {groupRegions && expanded && (
        <div className="mt-3 border-l-4 border-accent/40 pl-3">
          <h3 className="mb-2 text-sm font-semibold text-ink">Regioner – uppdelat</h3>
          <DataTable<GroupRow>
            caption="Regioner"
            rows={regionRows}
            columns={regionColumns}
            rowKey={(r) => r.key}
            initialSort={{ key: 'key', dir: 'asc' }}
            selectedKey={selectedKey}
            onRowClick={(r) => onRowClick(r.key)}
            maxHeight="24rem"
          />
        </div>
      )}
    </div>
  );
}

function StodMain({
  cases,
  roles,
  selectedKey,
  onRowClick,
}: {
  cases: CaseRow[];
  roles: Role[];
  selectedKey: string | null;
  onRowClick: (k: string) => void;
}) {
  const rows = useMemo(() => groupBySupport(cases, roles), [cases, roles]);
  const columns = useMemo(() => groupColumns('Stöd', [avgColumn]), []);
  return (
    <div className="space-y-4">
      <DataTable<GroupRow>
        caption="Stöd"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        initialSort={{ key: 'key', dir: 'asc' }}
        selectedKey={selectedKey}
        onRowClick={(r) => onRowClick(r.key)}
      />
    </div>
  );
}

/* ---------- Detaljpanel / korsbrytning ---------- */

function DetailPanel({
  selection,
  cases,
  roles,
  onClose,
  onApplyFilter,
}: {
  selection: Selection;
  cases: CaseRow[];
  roles: Role[];
  onClose: () => void;
  onApplyFilter: (patch: Partial<Filters>) => void;
}) {
  const { perspective, key } = selection;
  const kpis = useMemo(() => calculateKPIs(cases, roles), [cases, roles]);

  let title: ReactNode;
  let applyPatch: Partial<Filters>;
  if (perspective === 'user') {
    const [role, user] = splitUserKey(key);
    title = (
      <>
        {user} <span className="text-sm font-normal text-ink-muted">· {ROLE_LABEL[role]}</span>
      </>
    );
    applyPatch = { users: [user], roles: [role] };
  } else if (perspective === 'org') {
    title = key === REGIONS_KEY ? REGIONS_LABEL : key;
    applyPatch = { orgs: key === REGIONS_KEY ? [...new Set(cases.map((c) => c.org))] : [key] };
  } else {
    title = key;
    applyPatch = { stod: [key] };
  }

  const sections: Perspective[] = (['org', 'stod', 'user'] as Perspective[]).filter((p) => p !== perspective);

  return (
    <aside
      aria-label="Korsanalys för vald rad"
      className="min-w-0 self-start rounded-lg border-2 border-accent/40 bg-surface p-4 shadow-sm xl:sticky xl:top-4"
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Korsanalys</div>
          <h2 className="truncate text-xl font-semibold text-ink">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => onApplyFilter(applyPatch)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
          title="Lägg till som globalt filter – filtret ligger kvar när du byter flik"
        >
          Använd som filter
        </button>
        <button type="button" onClick={onClose} aria-label="Stäng panelen" className="rounded-md border border-line px-2 py-1.5 text-sm hover:border-accent">
          ✕
        </button>
      </div>
      <KpiCards kpis={kpis} compact />
      <div className="mt-4 space-y-6">
        {sections.map((p) => (
          <DetailSection key={p} perspective={p} parent={perspective} cases={cases} roles={roles} />
        ))}
      </div>
    </aside>
  );
}

function DetailSection({
  perspective,
  parent,
  cases,
  roles,
}: {
  perspective: Perspective;
  parent: Perspective;
  cases: CaseRow[];
  roles: Role[];
}) {
  const total = useMemo(() => cases.reduce((s, c) => s + c.belopp, 0), [cases]);
  if (perspective === 'user') {
    return <DetailUsers cases={cases} roles={roles} showOrg={parent !== 'org'} />;
  }
  const rows = perspective === 'org' ? groupByOrg(cases, roles) : groupBySupport(cases, roles);
  const heading = perspective === 'org' ? 'Fördelning per beslutande org' : 'Fördelning per stöd';
  const columns =
    perspective === 'org' ? groupColumns('Beslutande org', [shareColumn(total)]) : groupColumns('Stöd', [avgColumn]);
  return (
    <section>
      <h3 className="mb-2 font-semibold text-ink">{heading}</h3>
      {perspective === 'stod' && rows.length > 0 && (
        <div className="mb-3 grid gap-4 sm:grid-cols-2">
          <BarList title="Antal ärenden" items={rows.map((r) => ({ key: r.key, value: r.caseCount }))} format={formatNum} sortByLabel />
          <BarList title="Nettobeviljat belopp" items={rows.map((r) => ({ key: r.key, value: r.totalGrantedAmount }))} format={formatKr} sortByLabel />
        </div>
      )}
      <DataTable<GroupRow>
        caption={heading}
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        initialSort={perspective === 'stod' ? { key: 'key', dir: 'asc' } : { key: 'caseCount', dir: 'desc' }}
        maxHeight="18rem"
        compact
      />
    </section>
  );
}

function DetailUsers({ cases, roles, showOrg }: { cases: CaseRow[]; roles: Role[]; showOrg: boolean }) {
  const rows = useMemo(() => groupByUser(cases, roles), [cases, roles]);
  const columns = useMemo(() => userColumns({ showOrg, compact: true }), [showOrg]);
  return (
    <section>
      <h3 className="mb-2 font-semibold text-ink">
        Fördelning per användare <span className="text-sm font-normal text-ink-muted">({formatNum(rows.length)})</span>
      </h3>
      <DataTable<UserRow>
        caption="Fördelning per användare"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        initialSort={{ key: 'caseCount', dir: 'desc' }}
        maxHeight="22rem"
        compact
      />
    </section>
  );
}
