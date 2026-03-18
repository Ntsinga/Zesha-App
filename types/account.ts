/**
 * Account types matching backend models/accounts.py
 */
import type { BaseModel, BulkOperationResponse } from "./base";
import type { AccountTypeEnum, CommissionModelEnum } from "./enums";

/**
 * Embedded commission schedule summary (from backend AccountScheduleSummary)
 */
export interface AccountScheduleSummary {
  id: number;
  name: string;
  isActive: boolean;
  ruleCount: number;
}

/**
 * Account entity - matches backend Account model
 */
export interface Account extends BaseModel {
  name: string;
  description: string | null;
  accountType: AccountTypeEnum;
  isActive: boolean;
  companyId: number | null;
  isTemplate: boolean;
  initialBalance?: number | null;
  currentBalance?: number | null;
  commissionModel?: CommissionModelEnum;
  commissionScheduleId?: number | null;
  commissionSchedule?: AccountScheduleSummary | null;
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
 * Create a system-wide template account (Super Admin only)
 */
export interface AccountTemplateCreate {
  name: string;
  accountType: AccountTypeEnum;
  description?: string;
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
