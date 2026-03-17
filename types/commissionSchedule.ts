/**
 * Commission Schedule, Rule, and Tier types
 * Matching backend commission_schedule.py schemas
 */
import type { BaseModel } from "./base";
import type {
  CommissionRuleTypeEnum,
  TransactionSubtypeEnum,
  TransactionTypeEnum,
} from "./enums";

// ─── Tier ────────────────────────────────────────────────────────────────────

export interface CommissionTier extends BaseModel {
  ruleId: number;
  minAmount: number;
  maxAmount: number | null; // null = open-ended top tier
  customerChargeAmount: number;
  agentCommissionAmount: number;
  sortOrder: number;
}

export interface CommissionTierCreate {
  minAmount: number;
  maxAmount: number | null;
  customerChargeAmount: number;
  agentCommissionAmount: number;
  sortOrder: number;
}

// ─── Rule ────────────────────────────────────────────────────────────────────

export interface CommissionRule extends BaseModel {
  scheduleId: number;
  companyId: number;
  transactionType: TransactionTypeEnum;
  transactionSubtype: TransactionSubtypeEnum | null;
  ruleType: CommissionRuleTypeEnum;
  // PERCENTAGE fields
  rate: number | null;
  volumeCap: number | null;
  commissionCap: number | null;
  isActive: boolean;
  tiers: CommissionTier[];
}

export interface CommissionRuleCreate {
  transactionType: TransactionTypeEnum;
  transactionSubtype: TransactionSubtypeEnum | null;
  ruleType: CommissionRuleTypeEnum;
  rate?: number | null;
  volumeCap?: number | null;
  commissionCap?: number | null;
  tiers?: CommissionTierCreate[];
}

// During revision, transaction_type and transaction_subtype are immutable —
// the backend enforces this and the thunk injects them automatically from state.
export type CommissionRuleRevise = Omit<CommissionRuleCreate, "transactionType" | "transactionSubtype">

// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface CommissionSchedule extends BaseModel {
  companyId: number | null;
  name: string;
  description: string | null;
  isActive: boolean;
  isTemplate: boolean;
}

export interface CommissionScheduleDetail extends CommissionSchedule {
  rules: CommissionRule[];
}

export interface CommissionScheduleCreate {
  companyId: number;
  name: string;
  description?: string | null;
}

export interface CommissionTemplateCreate {
  name: string;
  description?: string | null;
}

export interface CommissionScheduleUpdate {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CommissionScheduleFilters {
  companyId: number;
}
