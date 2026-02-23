// API Configuration
// Uses environment variable for production, fallback to ngrok for development

// Get API URL from environment or use development fallback
const getApiBaseUrl = (): string => {
  // Check for environment variable first (production)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Development fallback - ngrok URL
  // WARNING: Update this when your ngrok URL changes
  if (__DEV__) {
    return "https://eee3-196-250-65-167.ngrok-free.app";
  }

  // Production — EXPO_PUBLIC_API_URL must be set
  throw new Error(
    "[API] EXPO_PUBLIC_API_URL environment variable is not set. " +
    "Cannot determine API base URL in production."
  );
};

export const API_BASE_URL = getApiBaseUrl();

// Default headers for API requests
// The ngrok-skip-browser-warning header bypasses the ngrok interstitial page
export const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  // Only include ngrok header in development
  ...(__DEV__ ? { "ngrok-skip-browser-warning": "true" } : {}),
};

// API Endpoints - matching FastAPI backend routers
export const API_ENDPOINTS = {
  // Users - matches routers/users.py
  users: {
    list: "/users/",
    sync: "/users/sync",
    invite: "/users/invite",
    getByClerkId: (clerkId: string) => `/users/clerk/${clerkId}`,
    get: (id: number) => `/users/${id}`,
    update: (id: number) => `/users/${id}`,
    delete: (id: number) => `/users/${id}`,
    deactivate: (id: number) => `/users/${id}/deactivate`,
    activate: (id: number) => `/users/${id}/activate`,
  },

  // Balances
  balances: {
    list: "/balances/",
    create: "/balances/create",
    bulk: "/balances/bulk",
    bulkUpdate: "/balances/bulk/update",
    get: (id: number) => `/balances/${id}`,
    update: (id: number) => `/balances/${id}`,
    delete: (id: number) => `/balances/${id}`,
  },

  // Expenses
  expenses: {
    list: "/expenses/",
    create: "/expenses/",
    get: (id: number) => `/expenses/${id}`,
    update: (id: number, companyId: number) =>
      `/expenses/${id}?company_id=${companyId}`,
    delete: (id: number, companyId: number) =>
      `/expenses/${id}?company_id=${companyId}`,
  },

  // Commissions
  commissions: {
    list: "/commissions/",
    create: "/commissions/",
    bulk: "/commissions/bulk",
    bulkUpdate: "/commissions/bulk/update",
    get: (id: number) => `/commissions/${id}`,
    update: (id: number) => `/commissions/${id}`,
    delete: (id: number) => `/commissions/${id}`,
  },

  // Cash Count (Denominations)
  cashCount: {
    list: "/cash-counts/",
    create: "/cash-counts/create",
    bulk: "/cash-counts/bulk",
    summary: "/cash-counts/summary",
    get: (id: number) => `/cash-counts/${id}`,
    update: (id: number) => `/cash-counts/${id}`,
    delete: (id: number) => `/cash-counts/${id}`,
  },

  // Reconciliations
  reconciliations: {
    list: "/reconciliations/",
    history: "/reconciliations/history",
    create: "/reconciliations/",
    get: (id: number) => `/reconciliations/${id}`,
    update: (id: number) => `/reconciliations/${id}`,
    delete: (id: number) => `/reconciliations/${id}`,
    details: (date: string, shift: string) =>
      `/reconciliations/${date}/${shift}/details`,
    calculate: (date: string, shift: string) =>
      `/reconciliations/${date}/${shift}/calculate`,
    finalize: (date: string, shift: string) =>
      `/reconciliations/${date}/${shift}/finalize`,
    approve: (date: string, shift: string) =>
      `/reconciliations/${date}/${shift}/approve`,
    balanceValidation: (date: string, shift: string) =>
      `/reconciliations/${date}/${shift}/balance-validation`,
    notify: (id: number) => `/reconciliations/${id}/notify`,
  },

  // Company Info
  companyInfo: {
    list: "/company-info/",
    create: "/company-info/",
    get: (id: number) => `/company-info/${id}`,
    update: (id: number) => `/company-info/${id}`,
    delete: (id: number) => `/company-info/${id}`,
    snapshot: (id: number) => `/company-info/${id}/snapshot`,
  },

  // Accounts
  accounts: {
    list: "/accounts/",
    create: "/accounts/create",
    bulk: "/accounts/bulk",
    get: (id: number) => `/accounts/${id}`,
    update: (id: number) => `/accounts/${id}`,
    delete: (id: number) => `/accounts/${id}`,
    deactivate: (id: number) => `/accounts/${id}/deactivate`,
    activate: (id: number) => `/accounts/${id}/activate`,
  },

  // Transactions - matches routers/transactions.py
  transactions: {
    list: "/transactions/",
    create: "/transactions/create",
    floatPurchase: "/transactions/float-purchase",
    bulk: "/transactions/bulk",
    get: (id: number) => `/transactions/${id}`,
    update: (id: number) => `/transactions/${id}`,
    reverse: (id: number) => `/transactions/${id}/reverse`,
    accountBalance: (accountId: number) =>
      `/transactions/account/${accountId}/balance`,
    accountStatement: (accountId: number) =>
      `/transactions/account/${accountId}/statement`,
    companyStatement: "/transactions/statement",
    analyticsSummary: "/transactions/analytics/summary",
    analyticsDaily: "/transactions/analytics/daily",
    verifyBalance: (accountId: number) =>
      `/transactions/account/${accountId}/verify-balance`,
    verifyAll: "/transactions/accounts/verify-all",
  },

  // AI Extraction
  extraction: {
    extract: "/extraction/extract",
    validate: "/extraction/validate",
    health: "/extraction/health",
  },
} as const;

// Helper to build query strings
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
