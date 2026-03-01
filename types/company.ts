/**
 * Company types matching backend models/company_info.py
 */
import type { BaseModel } from "./base";
import type { ShiftEnum } from "./enums";
import type { CommissionBreakdown } from "./commission";

/**
 * Company entity - matches backend CompanyInfo model
 */
export interface CompanyInfo extends BaseModel {
  name: string;
  emails: string[] | null;
  totalWorkingCapital: number;
  outstandingBalance: number;
  currency: string;
  description: string | null;
}

/**
 * Create company payload
 */
export interface CompanyInfoCreate {
  name: string;
  emails?: string[];
  totalWorkingCapital?: number;
  outstandingBalance?: number;
  currency?: string;
  description?: string;
}

/**
 * Update company payload
 */
export interface CompanyInfoUpdate {
  name?: string;
  emails?: string[];
  totalWorkingCapital?: number;
  outstandingBalance?: number;
  currency?: string;
  description?: string;
}

/**
 * Company snapshot for dashboard - aggregated data for a point in time
 */
export interface CompanySnapshot {
  company: CompanyInfo;
  snapshotDate: string;
  shift: ShiftEnum;
  totalFloat: number;
  totalCash: number;
  grandTotal: number;
  // Commission data
  totalCommission: number;
  dailyCommission: number;
  commissionCount?: number;
  accountsWithCommission?: number;
  commissionBreakdown: CommissionBreakdown[];
  // Financial calculations
  totalExpenses: number;
  expectedGrandTotal: number;
  capitalVariance: number;
  // Data counts
  balanceCount?: number;
  cashCountRecords?: number;
}

/**
 * Live operating capital snapshot - real-time intraday capital estimate
 */
export interface LiveCapitalSnapshot {
  liveFloat: number;
  liveCash: number;
  liveGrandTotal: number;
  lastReconciliationDate: string | null;
  lastReconciliationShift: string | null;
  lastReconciliationBoundary: string | null; // ISO datetime - exact cutoff for the live delta
  transactionsSinceRecon: number;
  depositTotal: number;
  withdrawalTotal: number;
  floatPurchaseTotal: number;
}
