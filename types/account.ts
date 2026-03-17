/**
 * Account types matching backend models/accounts.py
 */
import type { BaseModel, BulkOperationResponse } from "./base";
import type { AccountTypeEnum, CommissionModelEnum } from "./enums";

/**
 * Account entity - matches backend Account model
 */
export interface Account extends BaseModel {
  name: string;
  description: string | null;
  accountType: AccountTypeEnum;
  isActive: boolean;
  companyId: number;
  initialBalance?: number | null;
  currentBalance?: number | null;
  commissionModel?: CommissionModelEnum;
  commissionScheduleId?: number | null;
}

/**
 * Create account payload
 */
export interface AccountCreate {
  name: string;
  description?: string;
  accountType: AccountTypeEnum;
  isActive?: boolean;
  companyId: number;
  initialBalance?: number;
  commissionModel?: CommissionModelEnum;
  commissionScheduleId?: number | null;
}

/**
 * Update account payload
 */
export interface AccountUpdate {
  name?: string;
  description?: string;
  accountType?: AccountTypeEnum;
  isActive?: boolean;
  companyId?: number;
  commissionModel?: CommissionModelEnum;
  commissionScheduleId?: number | null;
}

/**
 * Filters for listing accounts
 */
export interface AccountFilters {
  accountType?: AccountTypeEnum;
  isActive?: boolean;
  search?: string;
  companyId?: number;
  skip?: number;
  limit?: number;
}

/**
 * Bulk account creation
 */
export interface BulkAccountCreate {
  accounts: AccountCreate[];
}

/**
 * Bulk account response
 */
export type BulkAccountResponse = BulkOperationResponse<
  Account,
  { index: number; name: string; error: string }
>;
