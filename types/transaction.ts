/**
 * Transaction types matching backend models/transactions.py and schemas/transaction.py
 */
import type { BaseModel, BulkOperationResponse } from "./base";
import type { ShiftEnum, TransactionTypeEnum } from "./enums";
import type { Account } from "./account";

/**
 * Lightweight commission info embedded in Transaction read
 */
export interface ExpectedCommissionBrief {
  commissionRate: number;
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
  amount: number;
  transactionTime: string;
  shift: ShiftEnum;
  balanceAfter: number;
  linkedTransactionId?: number | null;
  reconciliationId?: number | null;
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
  transactionType: Exclude<TransactionTypeEnum, "FLOAT_PURCHASE" | "CAPITAL_INJECTION">;
  amount: number;
  transactionTime: string;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Create a float purchase (linked transfer between accounts)
 * Creates two linked transactions: debit from source, credit to destination
 */
export interface FloatPurchaseCreate {
  companyId: number;
  sourceAccountId: number;
  destinationAccountId: number;
  amount: number;
  transactionTime: string;
  reference?: string | null;
  notes?: string | null;
  isConfirmed?: boolean; // default true; false = pending destination confirmation
}

/**
 * Capital injection creation - owner adds working capital
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
 * Float purchase read response - both linked transactions
 */
export interface FloatPurchaseRead {
  sourceTransaction: Transaction;
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
  totalDeposits: number;
  totalWithdrawals: number;
  totalFloatPurchases: number;
  netCashFlow: number;
  transactionCount: number;
  depositCount: number;
  withdrawCount: number;
  floatPurchaseCount: number;
  perAccountFlows: Array<{
    accountId: number;
    accountName: string;
    totalDeposits: number;
    totalWithdrawals: number;
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
