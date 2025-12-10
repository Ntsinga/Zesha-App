// API Configuration
// Update this to match your FastAPI backend URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://e64b81947350.ngrok-free.app";

// Default headers for API requests
// The ngrok-skip-browser-warning header bypasses the ngrok interstitial page
export const API_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

// API Endpoints
export const API_ENDPOINTS = {
  // Balances
  balances: {
    list: "/balances/",
    create: "/balances/create",
    get: (id: number) => `/balances/${id}`,
    update: (id: number) => `/balances/${id}`,
    delete: (id: number) => `/balances/${id}`,
  },

  // Expenses
  expenses: {
    list: "/expenses/",
    create: "/expenses/",
    get: (id: number) => `/expenses/${id}`,
    update: (id: number) => `/expenses/${id}`,
    delete: (id: number) => `/expenses/${id}`,
  },

  // Commissions
  commissions: {
    list: "/commissions/",
    create: "/commissions/",
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
    create: "/reconciliations/",
    get: (id: number) => `/reconciliations/${id}`,
    update: (id: number) => `/reconciliations/${id}`,
    delete: (id: number) => `/reconciliations/${id}`,
    perform: "/reconciliations/perform",
    summary: "/reconciliations/summary",
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
