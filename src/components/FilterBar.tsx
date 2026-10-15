import { useMemo } from 'react';
import type { CaseRow, Filters, Role } from '../lib/types';
import { ROLE_LABEL, ROLES } from '../lib/types';
import { isRegion, naturalCompare, usersOf } from '../lib/aggregate';
import { MultiSelect } from './MultiSelect';

interface Props {
  cases: CaseRow[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

const SHORT_ROLE: Record<Role, string> = { handlaggare: 'Handläggare', ekonom: 'Ekonom', beslutsfattare: 'Beslutsfattare' };

export function FilterBar({ cases, filters, onChange }: Props) {
  const { orgs, stod, users, userRole } = useMemo(() => {
    const o = new Set<string>();
    const s = new Set<string>();
    const userRole = new Map<string, Role>();
    for (const c of cases) {
      o.add(c.org);
      s.add(c.stod);
      for (const u of usersOf(c)) if (!userRole.has(u.user)) userRole.set(u.user, u.role);
    }
    return {
      orgs: [...o].sort(naturalCompare),
      stod: [...s].sort(naturalCompare),
      users: [...userRole.keys()].sort(naturalCompare),
      userRole,
    };
  }, [cases]);

  const orgQuickPicks = useMemo(() => {
    const picks = [];
    const hm = orgs.filter((o) => o.toLowerCase().includes('huvudmyndighet'));
    if (hm.length) picks.push({ label: 'Huvudmyndigheten', values: hm });
    const regions = orgs.filter(isRegion);
    if (regions.length) picks.push({ label: 'Alla regioner', values: regions });
    const mxy = orgs.filter((o) => /^myndighet\s/i.test(o));
    if (mxy.length) picks.push({ label: 'Myndighet X/Y', values: mxy });
    return picks;
  }, [orgs]);

  const userOptions = useMemo(
    () => (filters.roles.length ? users.filter((u) => filters.roles.includes(userRole.get(u)!)) : users),
    [users, userRole, filters.roles],
  );

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const chips: { label: string; onRemove: () => void }[] = [
    ...filters.orgs.map((o) => ({ label: `Org: ${o}`, onRemove: () => set({ orgs: filters.orgs.filter((x) => x !== o) }) })),
    ...filters.stod.map((s) => ({ label: `Stöd: ${s}`, onRemove: () => set({ stod: filters.stod.filter((x) => x !== s) }) })),
    ...filters.users.map((u) => ({ label: `Användare: ${u}`, onRemove: () => set({ users: filters.users.filter((x) => x !== u) }) })),
    ...filters.roles.map((r) => ({ label: `Roll: ${ROLE_LABEL[r]}`, onRemove: () => set({ roles: filters.roles.filter((x) => x !== r) }) })),
    ...(filters.onlyWithoutDecisionMaker
      ? [{ label: 'Endast utan beslutsfattare', onRemove: () => set({ onlyWithoutDecisionMaker: false }) }]
      : []),
  ];

  return (
    <section aria-label="Filter" className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.9fr_1fr_auto]">
        <MultiSelect
          label="Beslutande org"
          options={orgs}
          selected={filters.orgs}
          onChange={(v) => set({ orgs: v })}
          quickPicks={orgQuickPicks}
        />
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Stöd</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stöd">
            {stod.map((s) => {
              const on = filters.stod.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ stod: toggleIn(filters.stod, s) })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-line bg-surface hover:border-accent'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <MultiSelect
          label="Användare"
          options={userOptions}
          selected={filters.users}
          onChange={(v) => set({ users: v })}
          placeholder="Alla användare"
          renderOption={(u) => (
            <span className="flex w-full justify-between gap-2">
              <span>{u}</span>
              <span className="text-xs text-ink-muted">{SHORT_ROLE[userRole.get(u)!]}</span>
            </span>
          )}
        />
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Roll</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Roll">
            {ROLES.map((r) => {
              const on = filters.roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ roles: toggleIn(filters.roles, r) })}
                  className={`rounded-md border px-2.5 py-1.5 text-sm ${on ? 'border-accent bg-accent text-white' : 'border-line bg-surface hover:border-accent'}`}
                >
                  {SHORT_ROLE[r]}
                </button>
              );
            })}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.onlyWithoutDecisionMaker}
              onChange={(e) => set({ onlyWithoutDecisionMaker: e.target.checked })}
              className="accent-accent"
            />
            Endast ärenden utan beslutsfattare (0 kr)
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Aktiva filter</span>
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm text-ink">
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={`Ta bort filter ${c.label}`}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onChange({ orgs: [], stod: [], users: [], roles: [], onlyWithoutDecisionMaker: false })} className="ml-auto text-sm font-semibold text-accent underline-offset-2 hover:underline">
            Rensa alla filter
          </button>
        </div>
      )}
    </section>
  );
}
