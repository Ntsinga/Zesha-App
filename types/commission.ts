/**
 * Commission types matching backend models/commissions.py
 */
import type { BaseModel, BulkUpdateOperationResponse } from "./base";
import type { ShiftEnum, SourceEnum, AccountTypeEnum, CommissionVarianceStatus } from "./enums";
import type { Account } from "./account";

/**
 * Commission entity - matches backend Commissions model
 */
export interface Commission extends BaseModel {
  companyId: number;
  accountId: number;
  account?: Account; // Optional populated relationship
  reconciliationId?: number | null;
  shift: ShiftEnum;
  amount: number;
  imageUrl: string;
  mediaId?: string | null;
  messageId?: string | null;
  source: SourceEnum;
  sha256?: string | null;
  date: string;
  imageData?: string | null;
}

/**
 * Create commission payload
 */
export interface CommissionCreate {
  companyId: number;
  accountId: number;
  shift: ShiftEnum;
  amount: number;
  imageUrl?: string | null;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date: string;
  imageData?: string | null;
  reconciliationId?: number | null;
}

/**
 * Update commission payload
 */
export interface CommissionUpdate {
  accountId?: number;
  shift?: ShiftEnum;
  amount?: number;
  imageUrl?: string;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date?: string;
}

/**
 * Filters for listing commissions
 */
export interface CommissionFilters {
  accountId?: number;
  shift?: ShiftEnum;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Commission breakdown for dashboard
 */
export interface CommissionBreakdown {
  accountId: number;
  accountName: string;
  totalCommission: number;
  dailyCommission: number;
  recordCount?: number;
}

/**
 * Commission item for bulk update
 */
export interface CommissionItemUpdate {
  id: number;
  accountId?: number;
  shift?: ShiftEnum;
  amount?: number;
  imageUrl?: string;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date?: string;
}

/**
 * Bulk commission update payload
 */
export interface BulkCommissionUpdate {
  commissions: CommissionItemUpdate[];
}

/**
 * Bulk commission update response
 */
export interface BulkCommissionUpdateResponse {
  updated: Commission[];
  failed: Array<{ index: number; id: number; error: string }>;
  totalSubmitted: number;
  totalUpdated: number;
  totalFailed: number;
}

/**
 * Expected commission - auto-calculated from transactions
 * Matches backend ExpectedCommissionOut schema
 */
export interface ExpectedCommission {
  id: number;
  companyId: number;
  transactionId: number;
  accountId: number;
  accountName: string | null;
  transactionType: "DEPOSIT" | "WITHDRAW";
  transactionAmount: number;
  commissionRate: number;
  commissionAmount: number;
  shift: ShiftEnum;
  date: string;
  transactionTime: string | null;
}

/**
 * Filters for listing expected commissions
 */
export interface ExpectedCommissionFilters {
  companyId: number;
  accountId?: number;
  startDate?: string;
  endDate?: string;
  skip?: number;
  limit?: number;
}

/**
 * Per-account daily commission variance report
 * Returned by /expected-commissions/variance
 */
export interface CommissionVarianceReport {
  accountId: number;
  accountName: string;
  accountType: AccountTypeEnum;
  date: string;
  expected: number;
  actual: number; // always 0 for BANK accounts
  difference: number; // expected - actual
  status: CommissionVarianceStatus;
}

/**
 * Draft commission entry for Redux state persistence.
 * Serializable subset of the UI CommissionEntry (no File objects).
 */
export interface DraftCommissionEntry {
  id: string;
  accountId: number | null;
  accountName: string;
  shift: ShiftEnum;
  amount: string;
  imageUrl: string;
  extractedBalance: number | null;
  isExtracting: boolean;
  validationResult: {
    isValid: boolean;
    extractedBalance: number | null;
    inputBalance: number;
    difference: number | null;
    message: string;
  } | null;
}
