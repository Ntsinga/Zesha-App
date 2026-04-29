/**
 * Transaction types matching backend models/transactions.py and schemas/transaction.py
 */
import type { BaseModel, BulkOperationResponse } from "./base";
import type {
  FloatDirectionEnum,
  FloatSourceEnum,
  ShiftEnum,
  TransactionSubtypeEnum,
  TransactionTypeEnum,
} from "./enums";
import type { Account } from "./account";

/**
 * Lightweight commission info embedded in Transaction read
 */
export interface ExpectedCommissionBrief {
  commissionRate: number | null;
  commissionAmount: number;
}

/**
 * Transaction entity - matches backend TransactionRead schema
 */
export interface Transaction extends BaseModel {
  companyId: number;
  accountId: number;
  account?: Account; // Optional populated relationship
  transactionType: TransactionTypeEnum;
  transactionSubtype?: TransactionSubtypeEnum | null;
  amount: number;
  transactionTime: string;
  shift: ShiftEnum;
  balanceAfter: number;
  linkedTransactionId?: number | null;
  reconciliationId?: number | null;
  floatSource?: FloatSourceEnum | null;
  floatDirection?: FloatDirectionEnum | null;
  reference?: string | null;
  notes?: string | null;
  isConfirmed: boolean;
  expectedCommission?: ExpectedCommissionBrief | null;
}

/**
 * Create single transaction (DEPOSIT or WITHDRAW only)
 * FLOAT_PURCHASE must use FloatPurchaseCreate via /float-purchase endpoint
 */
export interface TransactionCreate {
  companyId: number;
  accountId: number;
  transactionType: Exclude<
    TransactionTypeEnum,
    "FLOAT_PURCHASE" | "CAPITAL_INJECTION"
  >;
  amount: number;
  transactionTime: string;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Create a float purchase.
 *
 * Internal transfer (floatSource omitted):
 *   sourceAccountId + destinationAccountId required; creates a linked debit/credit pair.
 *
 * External top-up (floatSource = "AGENT" | "BANK"):
 *   Only destinationAccountId required; creates a single credit transaction.
 */
export interface FloatPurchaseCreate {
  companyId: number;
  sourceAccountId?: number | null; // Required for internal transfer; omit for external
  destinationAccountId: number;
  amount: number;
  transactionTime: string;
  floatSource?: FloatSourceEnum | null; // Set for AGENT/BANK external top-ups
  reference?: string | null;
  notes?: string | null;
  isConfirmed?: boolean; // default true; false = pending destination confirmation
}

/**
 * Capital injection creation - owner adds working capital into an e-float account
 */
export interface CapitalInjectionCreate {
  companyId: number;
  accountId: number;
  amount: number;
  transactionTime: string;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Cash capital injection - owner adds physical cash capital (no account required)
 */
export interface CashCapitalInjectionCreate {
  companyId: number;
  amount: number;
  transactionTime: string;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Result returned after recording a cash capital injection
 */
export interface CashCapitalInjectionResult {
  companyId: number;
  amount: number;
  newTotalWorkingCapital: number;
  reference?: string | null;
  notes?: string | null;
  message: string;
}

export type StatementProvider = "MTN" | "AIRTEL";

export type StatementDecision = "READY" | "REVIEW" | "SKIP";

export type StatementFloatDirection = "IN" | "OUT";

export type StatementReviewDesignation =
  | "KEEP_REVIEW"
  | "REGULAR_DEPOSIT"
  | "REGULAR_WITHDRAW"
  | "FLOAT_PURCHASE_IN"
  | "FLOAT_PURCHASE_OUT"
  | "AIRTIME_DEPOSIT"
  | "VOICE_BUNDLE_DEPOSIT"
  | "DATA_BUNDLE_DEPOSIT"
  | "BILL_PAYMENT_DEPOSIT";

export interface StatementMetadata {
  provider: StatementProvider;
  filename: string;
  accountHolderName?: string | null;
  mobileNumber?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  openingBalance?: number | null;
  closingBalance?: number | null;
  totalCredit?: number | null;
  totalDebit?: number | null;
}

export interface StatementTransactionCandidate {
  companyId: number;
  accountId: number;
  transactionType: TransactionTypeEnum;
  transactionSubtype?: TransactionSubtypeEnum | null;
  amount: number;
  transactionTime: string;
  reference: string;
  floatSource?: FloatSourceEnum | null;
  floatDirection?: StatementFloatDirection | null;
  notes?: string | null;
}

export interface StatementParsedRow {
  rowIndex: number;
  providerReference: string;
  providerTransactionType: string;
  transactionTime: string;
  description?: string | null;
  fromParty?: string | null;
  toParty?: string | null;
  status?: string | null;
  creditDebit?: string | null;
  amount: number;
  fee: number;
  balance: number;
  decision: StatementDecision;
  mappedTransactionType?: TransactionTypeEnum | null;
  mappedTransactionSubtype?: TransactionSubtypeEnum | null;
  reason: string;
  candidate?: StatementTransactionCandidate | null;
  rawText?: string | null;
  overlapStatus?: StatementOverlapStatus;
  overlapTransactionIds?: number[];
  overlapDetail?: string | null;
}

export type StatementOverlapStatus =
  | "NO_MATCH"
  | "EXACT_MATCH"
  | "POSSIBLE_MATCH"
  | "REFERENCE_CONFLICT"
  | "REFERENCE_ONLY_MATCH"
  | "AMBIGUOUS_FLOAT_MATCH"
  | "UNMAPPED_ROW";

export interface StatementReviewOverride {
  rowIndex: number;
  providerReference: string;
  designation: StatementReviewDesignation;
}

export interface StatementTypeSummary {
  providerTransactionType: string;
  count: number;
  readyCount: number;
  reviewCount: number;
  skippedCount: number;
}

export interface StatementPreviewSummary {
  totalRows: number;
  readyCount: number;
  reviewCount: number;
  skippedCount: number;
  readyTotalAmount: number;
}

export interface StatementPreviewResponse {
  metadata: StatementMetadata;
  summary: StatementPreviewSummary;
  overlapSummary: StatementOverlapSummary;
  typeSummary: StatementTypeSummary[];
  rows: StatementParsedRow[];
}

export interface StatementOverlapSummary {
  exactMatchCount: number;
  possibleMatchCount: number;
  ambiguousMatchCount: number;
  referenceConflictCount: number;
  referenceOnlyMatchCount: number;
  unmappedRowCount: number;
  noMatchCount: number;
  existingOnlyCount: number;
}

export interface StatementImportResponse {
  batchId: number;
  metadata: StatementMetadata;
  totalReadyRows: number;
  selectedReviewRows: number;
  totalSelectedRows: number;
  overlapSummary: StatementOverlapSummary;
  importedCount: number;
  duplicateCount: number;
  overlapBlockedCount: number;
  reviewCount: number;
  skippedCount: number;
  duplicates: string[];
  overlapBlockedReferences: string[];
  imported: Transaction[];
}

export interface StatementImportRowRecord {
  batchId: number;
  importedTransactionId?: number | null;
  rowIndex: number;
  providerReference: string;
  providerTransactionType: string;
  transactionTime: string;
  description?: string | null;
  fromParty?: string | null;
  toParty?: string | null;
  status?: string | null;
  creditDebit?: string | null;
  amount: number;
  fee: number;
  balance: number;
  decision: StatementDecision;
  mappedTransactionType?: TransactionTypeEnum | null;
  mappedTransactionSubtype?: TransactionSubtypeEnum | null;
  selectedDesignation?: StatementReviewDesignation | null;
  finalDisposition: string;
  overlapStatus: StatementOverlapStatus;
  overlapTransactionIds: number[];
  overlapDetail?: string | null;
  reason: string;
  rawText?: string | null;
}

export interface StatementImportBatchHistoryItem {
  id: number;
  companyId: number;
  accountId: number;
  accountName?: string | null;
  provider: StatementProvider;
  status: string;
  fileName: string;
  uploadedBy?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalRows: number;
  readyCount: number;
  reviewCount: number;
  skippedCount: number;
  selectedReviewRows: number;
  importedCount: number;
  duplicateCount: number;
  overlapBlockedCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StatementImportBatchDetail extends StatementImportBatchHistoryItem {
  openingBalance?: number | null;
  closingBalance?: number | null;
  totalCredit?: number | null;
  totalDebit?: number | null;
  overlapSummary: StatementOverlapSummary;
  rows: StatementImportRowRecord[];
}

export interface StatementImportHistoryParams {
  accountId?: number;
  provider?: StatementProvider | null;
  skip?: number;
  limit?: number;
}

/**
 * Float purchase read response.
 * sourceTransaction is null for external top-ups (floatSource = AGENT/BANK).
 */
export interface FloatPurchaseRead {
  sourceTransaction: Transaction | null;
  destinationTransaction: Transaction;
}

/**
 * Update transaction - only notes can be modified for audit integrity
 */
export interface TransactionUpdate {
  notes?: string | null;
}

/**
 * Filters for listing transactions
 */
export interface TransactionFilters {
  companyId?: number;
  accountId?: number;
  transactionType?: TransactionTypeEnum;
  shift?: ShiftEnum;
  startDate?: string;
  endDate?: string;
  reconciliationId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Account statement response - single account
 */
export interface AccountStatement {
  account: Account;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFloatIn: number;
  totalFloatOut: number;
  transactions: Transaction[];
}

/**
 * Account statement summary in company-wide statement
 */
export interface AccountStatementSummary {
  account: Account;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFloatIn: number;
  totalFloatOut: number;
  netChange: number;
  transactionCount: number;
}

/**
 * Company-wide statement response
 */
export interface CompanyStatement {
  companyId: number;
  period: {
    startDate?: string;
    endDate?: string;
    shift?: ShiftEnum;
  };
  totalDeposits: number;
  totalWithdrawals: number;
  totalFloatPurchases: number;
  netCashFlow: number;
  totalTransactions: number;
  accounts: AccountStatementSummary[];
  transactions: Transaction[];
}

/**
 * Transaction analytics summary
 */
export interface TransactionAnalyticsSummary {
  period: {
    startDate?: string | null;
    endDate?: string | null;
    shift?: ShiftEnum | null;
  };
  totals: {
    deposits: number;
    withdrawals: number;
    floatPurchases: number;
    netFlow: number;
  };
  counts: {
    deposits: number;
    withdrawals: number;
    floatPurchases: number;
    total: number;
  };
  byAccount: Array<{
    accountId: number;
    accountName: string;
    accountType: string;
    deposits: number;
    withdrawals: number;
    floatIn: number;
    floatOut: number;
    netFlow: number;
    transactionCount: number;
  }>;
}

/**
 * Daily analytics entry for charts
 */
export interface TransactionDailyAnalytics {
  date: string;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFloatPurchases: number;
  netFlow: number;
  transactionCount: number;
}

/**
 * Bulk transaction creation
 */
export interface BulkTransactionCreate {
  transactions: TransactionCreate[];
}

/**
 * Bulk transaction response
 */
export interface BulkTransactionResponse {
  created: Transaction[];
  failed: Array<{ index: number; error: string }>;
  totalSubmitted: number;
  totalCreated: number;
  totalFailed: number;
}

/**
 * Account balance response from transactions endpoint
 */
export interface AccountBalanceResponse {
  accountId: number;
  accountName: string;
  currentBalance: number;
  initialBalance: number;
  transactionCount: number;
}
