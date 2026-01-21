// Enums matching FastAPI backend
export type ShiftEnum = "AM" | "PM";
export type SourceEnum = "whatsapp" | "mobile_app" | "manual";
export type AccountTypeEnum = "BANK" | "TELECOM";
export type RoleEnum = "admin" | "manager" | "agent";
export type StatusEnum = "PASSED" | "FAILED" | "FLAGGED";
export type ApprovalStatusEnum = "PENDING" | "APPROVED" | "REJECTED";
export type ReconciliationStatusEnum = "DRAFT" | "CALCULATED" | "FINALIZED";
export type ReconciliationTypeEnum = "WHATSAPP" | "MOBILE_APP" | "MANUAL";

// Base model fields (from BaseModel)
export interface BaseModel {
  id: number;
  created_at: string;
  updated_at: string | null;
}

// ============= USERS =============
export interface User extends BaseModel {
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  phone_number: string | null;
  role: RoleEnum;
  company_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  user_metadata: string | null;
}

export interface UserCreate {
  clerk_user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  role?: RoleEnum;
  company_id?: number | null;
  is_active?: boolean;
  user_metadata?: string | null;
}

export interface UserUpdate {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  role?: RoleEnum;
  company_id?: number | null;
  is_active?: boolean;
  last_login_at?: string | null;
  user_metadata?: string | null;
}

export interface UserSyncRequest {
  clerk_user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  user_metadata?: string | null;
  company_id?: number | null;
  role?: RoleEnum | null;
}

export interface UserInviteRequest {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  role?: RoleEnum;
  company_id?: number | null;
  redirect_url?: string | null;
}

export interface UserInviteResponse {
  success: boolean;
  message: string;
  clerk_user_id?: string;
  invitation_id?: string;
  email: string;
}

// ============= BALANCES =============
export interface Balance extends BaseModel {
  company_id: number;
  account_id: number;
  account?: Account; // Optional relationship data from backend
  reconciliation_id?: number | null;
  shift: ShiftEnum;
  amount: number;
  image_url: string; // Required in response
  media_id?: string | null; // WhatsApp only
  message_id?: string | null; // WhatsApp only
  source: SourceEnum;
  sha256?: string | null; // Can be null before processing
  date: string;
  image_data?: string | null; // Base64 encoded image for mobile app
}

export interface BalanceCreate {
  company_id: number;
  account_id: number;
  shift: ShiftEnum;
  amount: number;
  image_url?: string | null; // Optional for mobile app
  media_id?: string | null; // WhatsApp only
  message_id?: string | null; // WhatsApp only
  source?: SourceEnum; // Defaults to mobile_app
  sha256?: string | null; // Optional for mobile app (calculated server-side)
  date: string;
  image_data?: string | null; // Base64 encoded image from mobile app
  reconciliation_id?: number | null;
}

export interface BalanceUpdate {
  account_id?: number;
  shift?: ShiftEnum;
  amount?: number;
  image_url?: string;
  media_id?: string | null;
  message_id?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date?: string;
}

export interface BulkBalanceCreate {
  balances: BalanceCreate[];
}

export interface BulkBalanceResponse {
  created: Balance[];
  failed: Array<{
    index: number;
    account_id: number;
    error: string;
  }>;
  total_submitted: number;
  total_created: number;
  total_failed: number;
}

// ============= EXPENSES =============
export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Expense extends BaseModel {
  company_id: number;
  name: string;
  amount: number;
  description: string | null;
  expense_date: string;
  category: string | null;
}

export interface ExpenseCreate {
  company_id: number;
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
  company_id: number;
  account_id: number;
  account?: Account; // Optional relationship data from backend
  reconciliation_id?: number | null;
  shift: ShiftEnum;
  amount: number;
  image_url: string;
  media_id?: string | null;
  message_id?: string | null;
  source: SourceEnum;
  sha256?: string | null;
  date: string;
  image_data?: string | null;
}

export interface CommissionCreate {
  company_id: number;
  account_id: number;
  shift: ShiftEnum;
  amount: number;
  image_url?: string | null;
  media_id?: string | null;
  message_id?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date: string;
  image_data?: string | null;
  reconciliation_id?: number | null;
}

export interface CommissionUpdate {
  account_id?: number;
  shift?: ShiftEnum;
  amount?: number;
  image_url?: string;
  media_id?: string | null;
  message_id?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
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
  company_id: number;
  reconciliation_id?: number | null;
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
}

export interface CashCountCreate {
  company_id: number;
  denomination: number;
  quantity: number;
  amount: number;
  date: string;
  shift: ShiftEnum;
  reconciliation_id?: number | null;
}

export interface CashCountUpdate {
  denomination?: number;
  quantity?: number;
  amount?: number;
  date?: string;
  shift?: ShiftEnum;
}

export interface BulkCashCountCreate {
  cash_counts: CashCountCreate[];
}

export interface BulkCashCountResponse {
  created: CashCount[];
  failed: { index: number; denomination: number; error: string }[];
  total_submitted: number;
  total_created: number;
  total_failed: number;
}

export interface CashCountSummary {
  date: string;
  shift: ShiftEnum;
  total_amount: number;
  denomination_count: number;
  denominations: CashCount[];
}

// ============= RECONCILIATIONS =============
export type ReconciliationStatus = "PASSED" | "FAILED" | "FLAGGED";

// Simplified view for history list (matches backend ReconciliationHistory)
export interface ReconciliationHistory {
  id: number;
  date: string;
  shift: ShiftEnum;
  total_float: number;
  total_cash: number;
  total_commissions: number;
  expected_closing: number;
  actual_closing: number;
  variance: number;
  status: StatusEnum;
  approval_status: ApprovalStatusEnum;
  reconciliation_status?: ReconciliationStatusEnum;
  is_finalized: boolean;
  reconciled_by: number | null;
  reconciled_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string | null;
}

// Full reconciliation detail with related records
export interface ReconciliationDetail {
  reconciliation: ReconciliationHistory;
  balances: Balance[];
  commissions: Commission[];
  cash_counts: CashCount[];
}

export interface Reconciliation extends BaseModel {
  date: string;
  shift: ShiftEnum;
  company_id: number;
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
  reconciliation_status: ReconciliationStatusEnum;
  approval_status: ApprovalStatusEnum;
  is_finalized: boolean;
  reconciled_by: number | null;
  reconciled_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
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
  currency: string;
  description: string | null;
}

export interface CompanyInfoCreate {
  name: string;
  emails?: string[];
  total_working_capital?: number;
  outstanding_balance?: number;
  currency?: string;
  description?: string;
}

export interface CompanyInfoUpdate {
  name?: string;
  emails?: string[];
  total_working_capital?: number;
  outstanding_balance?: number;
  currency?: string;
  description?: string;
}

// ============= DASHBOARD TYPES =============
export interface CommissionBreakdown {
  account_id: number;
  account_name: string;
  total_commission: number;
  daily_commission: number;
  record_count?: number;
}

export interface CompanySnapshot {
  company: CompanyInfo;
  snapshot_date: string;
  shift: ShiftEnum;
  total_float: number;
  total_cash: number;
  grand_total: number;
  // Commission data
  total_commission: number;
  daily_commission: number;
  commission_count?: number;
  accounts_with_commission?: number;
  commission_breakdown: CommissionBreakdown[];
  // Financial calculations
  total_expenses: number;
  expected_grand_total: number;
  capital_variance: number;
  // Data counts
  balance_count?: number;
  cash_count_records?: number;
}

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

export interface AccountSummary {
  account_id: number;
  account_name: string; // Display name from account relationship
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
  account_id?: number;
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
  account_id?: number;
  shift?: ShiftEnum;
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

// ============= ACCOUNTS =============
export interface Account extends BaseModel {
  name: string;
  description: string | null;
  account_type: AccountTypeEnum;
  is_active: boolean;
  company_id: number;
}

export interface AccountCreate {
  name: string;
  description?: string;
  account_type: AccountTypeEnum;
  is_active?: boolean;
  company_id: number;
}

export interface AccountUpdate {
  name?: string;
  description?: string;
  account_type?: AccountTypeEnum;
  is_active?: boolean;
  company_id?: number;
}

export interface AccountFilters {
  account_type?: AccountTypeEnum;
  is_active?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface BulkAccountCreate {
  accounts: AccountCreate[];
}

export interface BulkAccountResponse {
  created: Account[];
  failed: { index: number; name: string; error: string }[];
  total_submitted: number;
  total_created: number;
  total_failed: number;
}
