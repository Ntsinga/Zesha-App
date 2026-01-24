/**
 * Expense types matching backend models/expenses.py
 */
import type { BaseModel } from "./base";

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
}

/**
 * Filters for listing expenses
 */
export interface ExpenseFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Expense category for UI
 */
export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
}
