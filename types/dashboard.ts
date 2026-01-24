/**
 * Dashboard-specific types for UI display
 */
import type { ShiftEnum } from "./enums";
import type { CommissionBreakdown } from "./commission";

/**
 * Dashboard summary - processed data for display
 */
export interface DashboardSummary {
  totalWorkingCapital: number;
  outstandingBalance: number;
  totalFloat: number;
  totalCash: number;
  grandTotal: number;
  expectedGrandTotal: number;
  totalExpenses: number;
  capitalVariance: number;
  // Commission data
  totalCommission: number;
  dailyCommission: number;
  commissionBreakdown: CommissionBreakdown[];
}

/**
 * Account summary for dashboard cards
 */
export interface AccountSummary {
  accountId: number;
  accountName: string;
  balance: number;
  shift: ShiftEnum;
  imageUrl?: string;
}

/**
 * Balance history entry for charts/lists
 */
export interface BalanceHistoryEntry {
  id: string;
  date: string;
  shift: ShiftEnum;
  totalFloat: number;
  totalCash: number;
  totalCommissions: number;
  expectedClosing: number;
  actualClosing: number;
  variance: number;
  status: "PASSED" | "FAILED" | "FLAGGED";
  isFinalized: boolean;
  reconciledBy: number | null;
  reconciledAt: string | null;
}

/**
 * View state enum for navigation
 */
export enum ViewState {
  DASHBOARD = "DASHBOARD",
  HISTORY = "HISTORY",
  BALANCES = "BALANCES",
  EXPENSES = "EXPENSES",
  RECONCILIATIONS = "RECONCILIATIONS",
}

/**
 * Transaction types (legacy - for backward compatibility)
 */
export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "Food & Dining"
  | "Transportation"
  | "Entertainment"
  | "Shopping"
  | "Bills & Utilities"
  | "Healthcare"
  | "Education"
  | "Other";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  hasReceipt: boolean;
  account: string;
}
