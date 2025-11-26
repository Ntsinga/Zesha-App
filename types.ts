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

// Alias for BalanceRecord for API compatibility
export interface BalanceHistoryEntry {
  id: string;
  date: string;
  totalCash: number;
  amount: number;
  capital: number;
  status: "Balanced" | "Pending" | "Discrepancy";
}

export interface BalanceRecord {
  id: string;
  date: string;
  totalCash: number;
  amount: number;
  capital: number;
  status: "Balanced" | "Pending" | "Discrepancy";
}

export interface AccountSummary {
  name: string;
  balance: number;
  lastAmount: number;
  pictureUrl?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export enum ViewState {
  DASHBOARD = "DASHBOARD",
  HISTORY = "HISTORY",
  TRANSACTIONS = "TRANSACTIONS",
  EXPENSES = "EXPENSES",
}
