/**
 * Commission types matching backend models/commissions.py
 */
import type { BaseModel, BulkUpdateOperationResponse } from "./base";
import type { ShiftEnum, SourceEnum } from "./enums";
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
