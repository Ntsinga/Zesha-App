/**
 * Zesha App - Type Definitions
 *
 * This barrel file exports all types used throughout the application.
 * Types are organized by domain for better maintainability.
 *
 * @module types
 */

// ============= Enums =============
export {
  type ShiftEnum,
  type SourceEnum,
  type AccountTypeEnum,
  type RoleEnum,
  type StatusEnum,
  type ApprovalStatusEnum,
  type ReconciliationStatusEnum,
  type ReconciliationTypeEnum,
  type TransactionTypeEnum,
  type BalanceValidationEnum,
} from "./enums";

// ============= Base Types =============
export {
  type BaseModel,
  type PaginatedResponse,
  type ApiError,
  type BulkOperationResponse,
  type BulkUpdateOperationResponse,
} from "./base";

// ============= User Types =============
export {
  type User,
  type UserCreate,
  type UserUpdate,
  type UserSyncRequest,
  type UserInviteRequest,
  type UserInviteResponse,
  type UserFilters,
} from "./user";

// ============= Account Types =============
export {
  type Account,
  type AccountCreate,
  type AccountUpdate,
  type AccountFilters,
  type BulkAccountCreate,
  type BulkAccountResponse,
} from "./account";

// ============= Balance Types =============
export {
  type Balance,
  type BalanceCreate,
  type BalanceUpdate,
  type BalanceFilters,
  type BulkBalanceCreate,
  type BulkBalanceResponse,
  type BalanceItemUpdate,
  type BulkBalanceUpdate,
  type BulkBalanceUpdateResponse,
  type DraftBalanceEntry,
  type BalanceValidationResult,
} from "./balance";

// ============= Commission Types =============
export {
  type Commission,
  type CommissionCreate,
  type CommissionUpdate,
  type CommissionFilters,
  type CommissionBreakdown,
  type CommissionItemUpdate,
  type BulkCommissionUpdate,
  type BulkCommissionUpdateResponse,
} from "./commission";

// ============= Expense Types =============
export {
  type Expense,
  type ExpenseCreate,
  type ExpenseUpdate,
  type ExpenseFilters,
  type ExpenseCategory,
} from "./expense";

// ============= Cash Count Types =============
export {
  type DenominationType,
  DENOMINATIONS,
  type CashCount,
  type CashCountCreate,
  type CashCountUpdate,
  type CashCountFilters,
  type BulkCashCountCreate,
  type BulkCashCountResponse,
  type CashCountSummary,
} from "./cashCount";

// ============= Reconciliation Types =============
export {
  type ReconciliationHistory,
  type ReconciliationDetail,
  type Reconciliation,
  type ReconciliationCreate,
  type ReconciliationUpdate,
  type ReconciliationCalculationResult,
  type ReconciliationSummary,
  type ReconciliationFilters,
  type ReconciliationHistoryParams,
  type ReconciliationDetailsParams,
  type ReconciliationCalculateParams,
  type ReconciliationFinalizeParams,
  type ReconciliationApproveParams,
  type ReconciliationApproveResult,
  type BalanceValidationResult as ReconciliationBalanceValidation,
  type BalanceValidationParams,
} from "./reconciliation";

// ============= Company Types =============
export {
  type CompanyInfo,
  type CompanyInfoCreate,
  type CompanyInfoUpdate,
  type CompanySnapshot,
} from "./company";

// ============= Transaction Types =============
export {
  type Transaction as TransactionRecord,
  type TransactionCreate,
  type FloatPurchaseCreate,
  type FloatPurchaseRead,
  type TransactionUpdate,
  type TransactionFilters,
  type AccountStatement,
  type AccountStatementSummary,
  type CompanyStatement,
  type TransactionAnalyticsSummary,
  type TransactionDailyAnalytics,
  type BulkTransactionCreate,
  type BulkTransactionResponse,
  type AccountBalanceResponse,
} from "./transaction";

// ============= Dashboard Types =============
export {
  type DashboardSummary,
  type AccountSummary,
  type BalanceHistoryEntry,
  ViewState,
  type TransactionType,
  type TransactionCategory,
  type Transaction,
} from "./dashboard";

// ============= API Mappers =============
export {
  toCamelCase,
  toSnakeCase,
  mapApiResponse,
  mapApiRequest,
  buildTypedQueryString,
} from "./mappers";

// ============= Legacy Compatibility =============
// Re-export with snake_case aliases for gradual migration
// TODO: Remove these after full migration to camelCase

/** @deprecated Use ReconciliationHistory instead */
export type { ReconciliationHistory as ReconciliationStatus } from "./reconciliation";
