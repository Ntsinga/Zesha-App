export type AuditValue =
  | string
  | number
  | boolean
  | null
  | AuditValue[]
  | { [key: string]: AuditValue | undefined };

export interface AuditActorSnapshot {
  userId?: number | null;
  clerkUserId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
}

export interface AuditFieldChange {
  field: string;
  before?: AuditValue;
  after?: AuditValue;
}

export interface AuditLogEntry {
  id: number;
  companyId?: number | null;
  action:
    | "create"
    | "update"
    | "delete"
    | "finalize"
    | "approve"
    | "reject"
    | "invite_user"
    | "update_user_role"
    | "activate_user"
    | "deactivate_user";
  entityType: string;
  entityId: string;
  actor: AuditActorSnapshot;
  fieldChanges: AuditFieldChange[];
  metadata: Record<string, AuditValue | undefined>;
  requestId?: string | null;
  occurredAt: string;
  summary?: string | null;
  createdAt?: string | null;
}

export interface AuditLogFilters {
  companyId?: number;
  action?: AuditLogEntry["action"];
  entityType?: string;
  entityId?: string;
  actorUserId?: number;
  dateFrom?: string;
  dateTo?: string;
  skip?: number;
  limit?: number;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  skip: number;
  limit: number;
}