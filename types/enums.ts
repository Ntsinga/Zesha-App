/**
 * Enums matching FastAPI backend
 * These types are shared between frontend and backend
 */

// Shift types for daily operations
export type ShiftEnum = "AM" | "PM";

// Data source tracking
export type SourceEnum = "whatsapp" | "mobile_app" | "manual" | "system";

// Account categories
export type AccountTypeEnum = "BANK" | "TELECOM";

// User permission levels - matches backend RoleEnum values
export type RoleEnum =
  | "Super Administrator"
  | "Administrator"
  | "Agent Supervisor"
  | "Agent";

// Reconciliation outcome status
export type StatusEnum = "PASSED" | "FAILED" | "FLAGGED";

// Approval workflow status
export type ApprovalStatusEnum = "PENDING" | "APPROVED" | "REJECTED";

// Reconciliation workflow stages
export type ReconciliationStatusEnum = "DRAFT" | "CALCULATED" | "FINALIZED";

// Transaction types - matches backend TransactionTypeEnum
export type TransactionTypeEnum = "DEPOSIT" | "WITHDRAW" | "FLOAT_PURCHASE" | "CAPITAL_INJECTION";

// Balance validation status - matches backend BalanceValidationEnum
export type BalanceValidationEnum = "PENDING" | "MATCHED" | "SHORTAGE" | "EXCESS";

// Legacy reconciliation type (deprecated - use SourceEnum)
export type ReconciliationTypeEnum = "WHATSAPP" | "MOBILE_APP" | "MANUAL";
