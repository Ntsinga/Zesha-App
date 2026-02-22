/**
 * Balance types matching backend models/balances.py
 */
import type {
  BaseModel,
  BulkOperationResponse,
  BulkUpdateOperationResponse,
} from "./base";
import type { ShiftEnum, SourceEnum, BalanceValidationEnum } from "./enums";
import type { Account } from "./account";

/**
 * Balance entity - matches backend Balance model
 */
export interface Balance extends BaseModel {
  companyId: number;
  accountId: number;
  account?: Account; // Optional populated relationship
  reconciliationId?: number | null;
  shift: ShiftEnum;
  amount: number;
  imageUrl: string;
  mediaId?: string | null; // WhatsApp only
  messageId?: string | null; // WhatsApp only
  source: SourceEnum;
  sha256?: string | null;
  date: string;
  imageData?: string | null; // Base64 encoded image
  // Transaction-derived validation fields (populated during reconciliation calculation)
  calculatedBalance?: number | null;
  balanceVariance?: number | null;
  validationStatus?: BalanceValidationEnum | null;
  discrepancyNotes?: string | null;
}

/**
 * Create balance payload
 */
export interface BalanceCreate {
  companyId: number;
  accountId: number;
  shift: ShiftEnum;
  amount: number;
  imageUrl?: string | null;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date: string;
  imageData?: string | null;
  reconciliationId?: number | null;
}

/**
 * Update balance payload
 */
export interface BalanceUpdate {
  accountId?: number;
  shift?: ShiftEnum;
  amount?: number;
  imageUrl?: string;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date?: string;
}

/**
 * Filters for listing balances
 */
export interface BalanceFilters {
  accountId?: number;
  shift?: ShiftEnum;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Bulk balance creation
 */
export interface BulkBalanceCreate {
  balances: BalanceCreate[];
}

/**
 * Bulk balance response
 */
export type BulkBalanceResponse = BulkOperationResponse<
  Balance,
  { index: number; accountId: number; error: string }
>;

/**
 * Balance item for bulk update
 */
export interface BalanceItemUpdate {
  id: number;
  accountId?: number;
  shift?: ShiftEnum;
  amount?: number;
  imageUrl?: string;
  mediaId?: string | null;
  messageId?: string | null;
  source?: SourceEnum;
  sha256?: string | null;
  date?: string;
}

/**
 * Bulk balance update payload
 */
export interface BulkBalanceUpdate {
  balances: BalanceItemUpdate[];
}

/**
 * Bulk balance update response
 */
export type BulkBalanceUpdateResponse = BulkUpdateOperationResponse<
  Balance,
  { index: number; id: number; error: string }
>;

/**
 * Draft balance entry for form state
 * Used by useAddBalanceScreen hook for temporary form entries
 */
export interface DraftBalanceEntry {
  id: string;
  accountId: number | null;
  accountName: string;
  shift: ShiftEnum;
  amount: string;
  imageUrl: string;
  imageFile?: File; // For web file upload
  extractedBalance: number | null;
  isExtracting: boolean;
  validationResult: BalanceValidationResult | null;
}

/**
 * Result from balance extraction and validation
 */
export interface BalanceValidationResult {
  isValid: boolean;
  extractedBalance: number | null;
  inputBalance: number;
  difference: number | null;
  message: string;
}
