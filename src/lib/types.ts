export interface CaseRow {
  nr: number;
  arendeId: number;
  org: string;
  handlaggare: string;
  ekonom: string;
  hanterasAv: string;
  beslutsfattare: string; // "" om saknas
  belopp: number;
  stod: string;
}

export type Role = 'handlaggare' | 'ekonom' | 'beslutsfattare';

export const ROLE_LABEL: Record<Role, string> = {
  handlaggare: 'Ansvarig handläggare',
  ekonom: 'Ekonom',
  beslutsfattare: 'Beslutsfattare',
};

export const ROLES: Role[] = ['handlaggare', 'ekonom', 'beslutsfattare'];

export interface Filters {
  orgs: string[];
  stod: string[];
  users: string[];
  roles: Role[]; // tom = alla roller
  onlyWithoutDecisionMaker: boolean;
}

export const EMPTY_FILTERS: Filters = {
  orgs: [],
  stod: [],
  users: [],
  roles: [],
  onlyWithoutDecisionMaker: false,
};

export interface RoleBreakdown {
  handlaggare: number;
  ekonom: number;
  beslutsfattare: number;
}

export interface Kpis {
  caseCount: number;
  uniqueUsersCount: number;
  roleBreakdown: RoleBreakdown;
  totalGrantedAmount: number;
}

export interface GroupRow extends Kpis {
  key: string;
}

export interface UserRow extends Kpis {
  key: string;
  user: string;
  role: Role;
  org: string;
  /** Antal unika kollegor (övriga användare) i personens ärenden. */
  collaborators: number;
}

export type Perspective = 'user' | 'org' | 'stod';
