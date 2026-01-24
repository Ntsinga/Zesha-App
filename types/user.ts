/**
 * User types matching backend schemas/user.py
 */
import type { BaseModel } from "./base";
import type { RoleEnum } from "./enums";

/**
 * User entity - matches backend UserResponse schema
 */
export interface User extends BaseModel {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phoneNumber: string | null;
  role: RoleEnum;
  companyId: number | null;
  isActive: boolean;
  lastLoginAt: string | null;
  userMetadata: string | null;
}

/**
 * Create user payload - matches backend UserCreate schema
 */
export interface UserCreate {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  phoneNumber?: string | null;
  role?: RoleEnum;
  companyId?: number | null;
  isActive?: boolean;
  userMetadata?: string | null;
}

/**
 * Update user payload - matches backend UserUpdate schema
 */
export interface UserUpdate {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  phoneNumber?: string | null;
  role?: RoleEnum;
  companyId?: number | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  userMetadata?: string | null;
}

/**
 * Sync request for Clerk user - matches backend UserSyncRequest schema
 */
export interface UserSyncRequest {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  phoneNumber?: string | null;
  userMetadata?: string | null;
  companyId?: number | null;
  role?: RoleEnum | null;
}

/**
 * Invite user request - matches backend UserInviteRequest schema
 */
export interface UserInviteRequest {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role?: RoleEnum;
  companyId?: number | null;
  redirectUrl?: string | null;
}

/**
 * Invite user response - matches backend UserInviteResponse schema
 */
export interface UserInviteResponse {
  success: boolean;
  message: string;
  clerkUserId?: string;
  invitationId?: string;
  email: string;
}

/**
 * Filters for listing users
 */
export interface UserFilters {
  companyId: number;
  isActive?: boolean;
  role?: RoleEnum;
  skip?: number;
  limit?: number;
}
