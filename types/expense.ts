/**
 * Expense types matching backend models/expenses.py
 */
import type { BaseModel } from "./base";

export type ExpenseStatus = "PENDING" | "CLEARED";
export type ExpenseFundingSource =
  | "CAPITAL"
  | "COMMISSIONS"
  | "EXTERNAL_INCOME";
export type RecurringExpenseStatus = "ACTIVE" | "PAUSED" | "ENDED";

/**
 * Expense entity - matches backend Expense model
 */
export interface Expense extends BaseModel {
  companyId: number;
  name: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  category: string | null;
  fundingSource: ExpenseFundingSource;
  status: ExpenseStatus;
  recurringExpenseId: number | null;
  generatedForMonth: string | null;
  clearedDate: string | null;
  clearedNotes: string | null;
  clearedBy: number | null;
}

/**
 * Create expense payload
 */
export interface ExpenseCreate {
  companyId: number;
  name: string;
  amount: number;
  description?: string;
  expenseDate: string;
  category?: string;
  fundingSource: ExpenseFundingSource;
}

/**
 * Update expense payload
 */
export interface ExpenseUpdate {
  name?: string;
  amount?: number;
  description?: string;
  expenseDate?: string;
  category?: string;
  fundingSource?: ExpenseFundingSource;
}

/**
 * Clear (recover/reimburse) expense payload
 */
export interface ExpenseClear {
  clearedBy?: number;
  clearedNotes?: string;
}

/**
 * Expense category — backend-persisted per company
 */
export interface ExpenseCategory {
  id: number;
  companyId: number;
  name: string;
}

export interface ExpenseCategoryCreate {
  companyId: number;
  name: string;
}

/**
 * Filters for listing expenses
 */
export interface ExpenseFilters {
  category?: string;
  fundingSource?: ExpenseFundingSource;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

export interface RecurringExpense extends BaseModel {
  companyId: number;
  name: string;
  amount: number;
  description: string | null;
  category: string | null;
  fundingSource: ExpenseFundingSource;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastGeneratedAt: string | null;
  nextDueDate: string | null;
  status: RecurringExpenseStatus;
}

export interface RecurringExpenseCreate {
  companyId: number;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  fundingSource: ExpenseFundingSource;
  dayOfMonth: number;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RecurringExpenseUpdate {
  name?: string;
  amount?: number;
  description?: string;
  category?: string;
  fundingSource?: ExpenseFundingSource;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RecurringExpenseFilters {
  companyId?: number;
  activeOnly?: boolean;
}

/**
 * Expense category for UI
 */
export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
}
