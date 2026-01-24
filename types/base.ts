/**
 * Base model interfaces matching SQLAlchemy BaseModel
 * All entities inherit these common fields
 */

/**
 * Base model fields from backend BaseModel
 * - id: Primary key
 * - createdAt: Timestamp when record was created
 * - updatedAt: Timestamp of last update (null if never updated)
 */
export interface BaseModel {
  id: number;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * API response wrapper for paginated lists
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Standard API error response
 */
export interface ApiError {
  detail: string;
  statusCode?: number;
}

/**
 * Bulk operation response for batch creates
 */
export interface BulkOperationResponse<
  T,
  F = { index: number; error: string },
> {
  created: T[];
  failed: F[];
  totalSubmitted: number;
  totalCreated: number;
  totalFailed: number;
}
