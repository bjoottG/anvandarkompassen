import type { Column } from './DataTable';
import type { GroupRow, Kpis, UserRow } from '../lib/types';
import { ROLE_LABEL } from '../lib/types';
import { formatKr, formatNum, formatPct } from '../lib/aggregate';

export const breakdownTitle = (k: Kpis) =>
  `Handläggare: ${k.roleBreakdown.handlaggare}\nEkonomer: ${k.roleBreakdown.ekonom}\nBeslutsfattare: ${k.roleBreakdown.beslutsfattare}`;

export function kpiColumns<T extends Kpis>(): Column<T>[] {
  return [
    {
      key: 'caseCount',
      label: 'Antal ärenden',
      numeric: true,
      bar: true,
      value: (r) => r.caseCount,
      render: (r) => formatNum(r.caseCount),
    },
    {
      key: 'uniqueUsersCount',
      label: 'Unika användare',
      numeric: true,
      value: (r) => r.uniqueUsersCount,
      render: (r) => formatNum(r.uniqueUsersCount),
      headerTitle: 'Unika handläggare, ekonomer och beslutsfattare i ärendena (hovra över en siffra för fördelning per roll)',
      cellTitle: breakdownTitle,
    },
    {
      key: 'totalGrantedAmount',
      label: 'Nettobeviljat belopp',
      numeric: true,
      bar: true,
      value: (r) => r.totalGrantedAmount,
      render: (r) => formatKr(r.totalGrantedAmount),
    },
  ];
}

export function groupColumns(label: string, extra: Column<GroupRow>[] = []): Column<GroupRow>[] {
  return [{ key: 'key', label, value: (r) => r.key, render: (r) => <span className="font-medium">{r.key}</span> }, ...kpiColumns<GroupRow>(), ...extra];
}

export const shareColumn = (total: number): Column<GroupRow> => ({
  key: 'share',
  label: 'Andel av total budget',
  numeric: true,
  value: (r) => (total ? r.totalGrantedAmount / total : 0),
  render: (r) => formatPct(total ? (r.totalGrantedAmount / total) * 100 : 0),
});

export const avgColumn: Column<GroupRow> = {
  key: 'avg',
  label: 'Snitt per ärende',
  numeric: true,
  value: (r) => (r.caseCount ? r.totalGrantedAmount / r.caseCount : 0),
  render: (r) => formatKr(r.caseCount ? r.totalGrantedAmount / r.caseCount : 0),
};

export function userColumns(opts: { showOrg?: boolean; compact?: boolean } = {}): Column<UserRow>[] {
  const cols: Column<UserRow>[] = [
    { key: 'user', label: 'Användare', value: (r) => r.user, render: (r) => <span className="font-medium">{r.user}</span> },
    { key: 'role', label: 'Roll', value: (r) => ROLE_LABEL[r.role], render: (r) => <RoleBadge role={r.role} short={opts.compact} /> },
  ];
  if (opts.showOrg !== false) cols.push({ key: 'org', label: 'Beslutande org', value: (r) => r.org });
  cols.push(...kpiColumns<UserRow>());
  // För en enskild person: unika användare i personens ärenden (inkl. personen själv);
  // antal kollegor visas i tooltip.
  cols[cols.findIndex((c) => c.key === 'uniqueUsersCount')] = {
    key: 'uniqueUsersCount',
    label: opts.compact ? 'Unika användare' : 'Unika användare i ärendena',
    numeric: true,
    value: (r) => r.uniqueUsersCount,
    render: (r) => formatNum(r.uniqueUsersCount),
    headerTitle: 'Antal unika användare i personens ärenden, inklusive personen själv',
    cellTitle: (r) => `${breakdownTitle(r)}\n(${r.collaborators} kollegor utöver ${r.user})`,
  };
  return cols;
}

const ROLE_STYLE = {
  handlaggare: 'bg-role-h/15 text-role-h ring-role-h/40',
  ekonom: 'bg-role-e/15 text-role-e ring-role-e/40',
  beslutsfattare: 'bg-role-b/15 text-role-b ring-role-b/40',
} as const;

const SHORT: Record<UserRow['role'], string> = { handlaggare: 'Handläggare', ekonom: 'Ekonom', beslutsfattare: 'Beslutsf.' };

export function RoleBadge({ role, short }: { role: UserRow['role']; short?: boolean }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ${ROLE_STYLE[role]}`}>
      {short ? SHORT[role] : ROLE_LABEL[role]}
    </span>
  );
}
