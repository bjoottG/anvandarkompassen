import type { CaseRow, Filters, GroupRow, Kpis, Role, UserRow } from './types';

/** Användarkopplingar för ett ärende (tomma beslutsfattare ignoreras). */
export function usersOf(c: CaseRow): { user: string; role: Role }[] {
  const out: { user: string; role: Role }[] = [];
  if (c.handlaggare) out.push({ user: c.handlaggare, role: 'handlaggare' });
  if (c.ekonom) out.push({ user: c.ekonom, role: 'ekonom' });
  if (c.beslutsfattare) out.push({ user: c.beslutsfattare, role: 'beslutsfattare' });
  return out;
}

export function filterCases(cases: CaseRow[], f: Filters): CaseRow[] {
  const orgs = new Set(f.orgs);
  const stod = new Set(f.stod);
  const users = new Set(f.users);
  const roles = new Set(f.roles);
  return cases.filter((c) => {
    if (orgs.size && !orgs.has(c.org)) return false;
    if (stod.size && !stod.has(c.stod)) return false;
    if (f.onlyWithoutDecisionMaker && c.beslutsfattare) return false;
    if (users.size) {
      // Ärendet matchar om någon vald användare medverkar (i vald roll, om roll är satt).
      const hit = usersOf(c).some((u) => users.has(u.user) && (!roles.size || roles.has(u.role)));
      if (!hit) return false;
    }
    return true;
  });
}

/** Nyckeltal för ett urval. Med `roles` räknas bara användare i de rollerna. */
export function calculateKPIs(cases: CaseRow[], roles: Role[] = []): Kpis {
  const want = (r: Role) => !roles.length || roles.includes(r);
  const h = new Set<string>();
  const e = new Set<string>();
  const b = new Set<string>();
  let total = 0;
  for (const c of cases) {
    if (c.handlaggare && want('handlaggare')) h.add(c.handlaggare);
    if (c.ekonom && want('ekonom')) e.add(c.ekonom);
    if (c.beslutsfattare && want('beslutsfattare')) b.add(c.beslutsfattare);
    total += c.belopp;
  }
  const all = new Set([...h, ...e, ...b]);
  return {
    caseCount: cases.length,
    uniqueUsersCount: all.size,
    roleBreakdown: { handlaggare: h.size, ekonom: e.size, beslutsfattare: b.size },
    totalGrantedAmount: total,
  };
}

function groupBy(cases: CaseRow[], key: (c: CaseRow) => string, roles: Role[]): GroupRow[] {
  const map = new Map<string, CaseRow[]>();
  for (const c of cases) {
    const k = key(c);
    let list = map.get(k);
    if (!list) map.set(k, (list = []));
    list.push(c);
  }
  return [...map].map(([k, list]) => ({ key: k, ...calculateKPIs(list, roles) }));
}

export const groupByOrg = (cases: CaseRow[], roles: Role[] = []) => groupBy(cases, (c) => c.org, roles);
export const groupBySupport = (cases: CaseRow[], roles: Role[] = []) => groupBy(cases, (c) => c.stod, roles);

export function groupByUser(cases: CaseRow[], roleFilter: Role[] = []): UserRow[] {
  const map = new Map<string, { user: string; role: Role; org: string; cases: CaseRow[] }>();
  for (const c of cases) {
    for (const u of usersOf(c)) {
      if (roleFilter.length && !roleFilter.includes(u.role)) continue;
      const k = `${u.role}|${u.user}`;
      let entry = map.get(k);
      if (!entry) map.set(k, (entry = { user: u.user, role: u.role, org: c.org, cases: [] }));
      entry.cases.push(c);
    }
  }
  return [...map].map(([k, e]) => {
    const kpis = calculateKPIs(e.cases, roleFilter);
    return {
      key: k,
      user: e.user,
      role: e.role,
      org: e.org,
      collaborators: Math.max(0, kpis.uniqueUsersCount - 1),
      ...kpis,
    };
  });
}

export const isRegion = (org: string) => /^region\s*\d+/i.test(org);

/** Naturlig sortering så att "region 2" kommer före "region 10" och "Namn2" före "Namn10". */
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, 'sv', { numeric: true, sensitivity: 'base' });

const sek = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
export const formatKr = (n: number) => `${sek.format(Math.round(n))} kr`;
export const formatNum = (n: number) => sek.format(n);
export const formatPct = (n: number) =>
  `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n)} %`;
