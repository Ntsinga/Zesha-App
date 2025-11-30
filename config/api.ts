// API Configuration
// Update this to match your FastAPI backend URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

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
    list: "/cash-count/",
    create: "/cash-count/",
    get: (id: number) => `/cash-count/${id}`,
    update: (id: number) => `/cash-count/${id}`,
    delete: (id: number) => `/cash-count/${id}`,
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
