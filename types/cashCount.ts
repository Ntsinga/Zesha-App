/**
 * Cash count types matching backend models/cash_counts.py
 */
import type { BaseModel, BulkOperationResponse } from "./base";
import type { ShiftEnum } from "./enums";

/**
 * Denomination values in cents
 * 50000 = R500, 20000 = R200, etc.
 */
export type DenominationType =
  | 50000
  | 20000
  | 10000
  | 5000
  | 2000
  | 1000
  | "1000_coin"
  | 500
  | 200
  | 100;

/**
 * Denomination display configuration
 */
export const DENOMINATIONS: { value: DenominationType; label: string }[] = [
  { value: 50000, label: "R500" },
  { value: 20000, label: "R200" },
  { value: 10000, label: "R100" },
  { value: 5000, label: "R50" },
  { value: 2000, label: "R20" },
  { value: 1000, label: "R10" },
  { value: "1000_coin", label: "R10 (Coin)" },
  { value: 500, label: "R5" },
  { value: 200, label: "R2" },
  { value: 100, label: "R1" },
];

/**
 * Cash count entity - matches backend CashCount model
 */
export interface CashCount extends BaseModel {
  companyId: number;
  reconciliationId?: number | null;
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
}

/**
 * Create cash count payload
 */
export interface CashCountCreate {
  companyId: number;
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
  reconciliationId?: number | null;
}

/**
 * Update cash count payload
 */
export interface CashCountUpdate {
  denomination?: number;
  quantity?: number;
  amount?: number;
  date?: string;
  shift?: ShiftEnum;
}

/**
 * Filters for listing cash counts
 */
export interface CashCountFilters {
  denomination?: number;
  shift?: ShiftEnum;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Bulk cash count creation
 */
export interface BulkCashCountCreate {
  cashCounts: CashCountCreate[];
}

/**
 * Bulk cash count response
 */
export type BulkCashCountResponse = BulkOperationResponse<
  CashCount,
  { index: number; denomination: number; error: string }
>;

/**
 * Cash count summary for a day/shift
 */
export interface CashCountSummary {
  date: string;
  shift: ShiftEnum;
  totalAmount: number;
  denominationCount: number;
  denominations: CashCount[];
}
