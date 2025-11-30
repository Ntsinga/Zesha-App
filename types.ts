// Enums matching FastAPI backend
export type ShiftEnum = "AM" | "PM";

// Base model fields (from BaseModel)
export interface BaseModel {
  id: number;
  created_at: string;
  updated_at: string | null;
}

// ============= BALANCES =============
export interface Balance extends BaseModel {
  account: string;
  shift: ShiftEnum;
  amount: number;
  image_url: string;
  media_id: string;
  message_id: string;
  source: string;
  sha256: string;
  date: string;
}

export interface BalanceCreate {
  account: string;
  shift: ShiftEnum;
  amount: number;
  image_url: string;
  media_id: string;
  message_id: string;
  source: string;
  sha256: string;
  date: string;
}

export interface BalanceUpdate {
  account?: string;
  shift?: ShiftEnum;
  amount?: number;
  image_url?: string;
}

// ============= EXPENSES =============
export interface Expense extends BaseModel {
  name: string;
  amount: number;
  description: string | null;
  expense_date: string;
  category: string | null;
}

export interface ExpenseCreate {
  name: string;
  amount: number;
  description?: string;
  expense_date: string;
  category?: string;
}

export interface ExpenseUpdate {
  name?: string;
  amount?: number;
  description?: string;
  expense_date?: string;
  category?: string;
}

// ============= COMMISSIONS =============
export interface Commission extends BaseModel {
  account: string;
  amount: number;
  date: string;
}

export interface CommissionCreate {
  account: string;
  amount: number;
  date: string;
}

export interface CommissionUpdate {
  account?: string;
  amount?: number;
  date?: string;
}

// ============= CASH COUNT (Denominations) =============
// Values in cents: 10000 = R100, 5000 = R50, 2000 = R20, 1000 = R10, 500 = R5, 200 = R2, 100 = R1
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

export interface CashCount extends BaseModel {
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
}

export interface CashCountCreate {
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
}

export interface CashCountUpdate {
  denomination?: number;
  quantity?: number;
  amount?: number;
  date?: string;
  shift?: ShiftEnum;
}

// ============= RECONCILIATIONS =============
export type ReconciliationStatus = "PASSED" | "FAILED";

export interface Reconciliation extends BaseModel {
  date: string;
  shift: ShiftEnum;
  calc_total_float: number;
  calc_total_cash: number;
  calc_grand_total: number;
  rep_total_float: number;
  rep_total_cash: number;
  rep_grand_total: number;
  variance_float: number;
  variance_cash: number;
  variance_grand: number;
  total_working_capital: number;
  outstanding_balance: number;
  total_expenses: number;
  expected_grand_total: number;
  capital_variance: number;
  status: ReconciliationStatus;
  reviewer: string | null;
  reviewed_at: string | null;
  run_key: string;
}

export interface ReconciliationCreate {
  date: string;
  shift: ShiftEnum;
  calc_total_float?: number;
  calc_total_cash?: number;
  calc_grand_total?: number;
  rep_total_float?: number;
  rep_total_cash?: number;
  rep_grand_total?: number;
  variance_float?: number;
  variance_cash?: number;
  variance_grand?: number;
  total_working_capital?: number;
  outstanding_balance?: number;
  total_expenses?: number;
  expected_grand_total?: number;
  capital_variance?: number;
  status: ReconciliationStatus;
  reviewer?: string;
  reviewed_at?: string;
  run_key: string;
}

export interface ReconciliationSummary {
  reported_balance_count: number;
  actual_balance_count: number;
  calculated_totals: {
    total_float: number;
    total_cash: number;
    grand_total: number;
  };
  reported_totals: {
    total_float: number;
    total_cash: number;
    grand_total: number;
  };
  is_ready: boolean;
  validation_errors: string[];
}

// ============= COMPANY INFO =============
export interface CompanyInfo extends BaseModel {
  name: string;
  emails: string[] | null;
  total_working_capital: number;
  outstanding_balance: number;
  description: string | null;
}

export interface CompanyInfoCreate {
  name: string;
  emails?: string[];
  total_working_capital?: number;
  outstanding_balance?: number;
  description?: string;
}

export interface CompanyInfoUpdate {
  name?: string;
  emails?: string[];
  total_working_capital?: number;
  outstanding_balance?: number;
  description?: string;
}

// ============= DASHBOARD TYPES =============
export interface DashboardSummary {
  totalWorkingCapital: number;
  outstandingBalance: number;
  totalFloat: number;
  totalCash: number;
  grandTotal: number;
  totalExpenses: number;
}

export interface AccountSummary {
  account: string;
  balance: number;
  shift: ShiftEnum;
  imageUrl?: string;
}

// ============= VIEW STATE =============
export enum ViewState {
  DASHBOARD = "DASHBOARD",
  HISTORY = "HISTORY",
  BALANCES = "BALANCES",
  EXPENSES = "EXPENSES",
  RECONCILIATIONS = "RECONCILIATIONS",
}

// ============= API FILTER TYPES =============
export interface BalanceFilters {
  account?: string;
  shift?: ShiftEnum;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export interface ExpenseFilters {
  category?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export interface ReconciliationFilters {
  on_date?: string;
  shift?: ShiftEnum;
  run_key?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export interface CommissionFilters {
  account?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export interface CashCountFilters {
  denomination?: number;
  shift?: ShiftEnum;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

// ============= UPDATE TYPES =============
export interface ReconciliationUpdate {
  date?: string;
  shift?: ShiftEnum;
  calc_total_float?: number;
  calc_total_cash?: number;
  calc_grand_total?: number;
  rep_total_float?: number;
  rep_total_cash?: number;
  rep_grand_total?: number;
  variance_float?: number;
  variance_cash?: number;
  variance_grand?: number;
  total_working_capital?: number;
  outstanding_balance?: number;
  total_expenses?: number;
  expected_grand_total?: number;
  capital_variance?: number;
  status?: ReconciliationStatus;
  reviewer?: string;
  reviewed_at?: string;
  run_key?: string;
}

// ============= LEGACY TYPES (for backward compatibility) =============
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

export interface BalanceHistoryEntry {
  id: string;
  date: string;
  totalCash: number;
  amount: number;
  capital: number;
  status: "Balanced" | "Pending" | "Discrepancy";
}
