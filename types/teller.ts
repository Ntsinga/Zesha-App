import type { ShiftEnum } from "./enums";

// ── Teller ──────────────────────────────────────────────────────────────────

export interface Teller {
  id: number;
  companyId: number;
  name: string;
  code: string | null;
  isActive: boolean;
  targetCash: number;
  targetFloat: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TellerCreate {
  companyId: number;
  name: string;
  targetCash?: number;
  targetFloat?: number;
}

export interface TellerUpdate {
  name?: string;
  code?: string;
  isActive?: boolean;
  targetCash?: number;
  targetFloat?: number;
}

export interface TellerDetail extends Teller {
  assignedAccounts: TellerAccountAssignmentRead[];
  assignedUsers: TellerUserAssignmentRead[];
}

// ── Account Assignments ─────────────────────────────────────────────────────

export interface TellerAccountAssignmentCreate {
  accountId: number;
  effectiveDate: string;
  effectiveShift: ShiftEnum;
}

export interface TellerAccountAssignmentEnd {
  endedAtDate: string;
  endedAtShift: ShiftEnum;
}

export interface TellerAccountAssignmentRead {
  id: number;
  tellerId: number;
  accountId: number;
  effectiveDate: string;
  effectiveShift: ShiftEnum;
  endedAtDate: string | null;
  endedAtShift: ShiftEnum | null;
  accountName?: string | null;
  accountNumber?: string | null;
}

// ── User Assignments ────────────────────────────────────────────────────────

export interface TellerUserAssignmentCreate {
  userId: number;
  effectiveDate: string;
  effectiveShift: ShiftEnum;
}

export interface TellerUserAssignmentEnd {
  endedAtDate: string;
  endedAtShift: ShiftEnum;
}

export interface TellerUserAssignmentRead {
  id: number;
  tellerId: number;
  userId: number;
  effectiveDate: string;
  effectiveShift: ShiftEnum;
  endedAtDate: string | null;
  endedAtShift: ShiftEnum | null;
  userName?: string | null;
  userEmail?: string | null;
}

// ── Filters ─────────────────────────────────────────────────────────────────

export interface TellerFilters {
  companyId?: number;
  isActive?: boolean;
}
