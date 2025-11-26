import {
  Transaction,
  BalanceHistoryEntry,
  AccountSummary,
  ExpenseCategory,
} from "../types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.example.com";

// Generic API response type
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Error class for API errors
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
}

// Dashboard API
export const dashboardApi = {
  getSummary: () =>
    fetchApi<{
      totalCapital: number;
      float: number;
      cash: number;
      outstanding: number;
    }>("/dashboard/summary"),

  getAccounts: () => fetchApi<AccountSummary[]>("/dashboard/accounts"),
};

// Transactions API
export const transactionsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    type?: "income" | "expense";
  }) =>
    fetchApi<ApiResponse<Transaction[]>>(
      `/transactions?${new URLSearchParams(params as Record<string, string>)}`
    ),

  getById: (id: string) => fetchApi<Transaction>(`/transactions/${id}`),

  create: (transaction: Omit<Transaction, "id">) =>
    fetchApi<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(transaction),
    }),

  update: (id: string, transaction: Partial<Transaction>) =>
    fetchApi<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(transaction),
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/transactions/${id}`, {
      method: "DELETE",
    }),
};

// Balance History API
export const balanceHistoryApi = {
  getAll: (params?: { startDate?: string; endDate?: string }) =>
    fetchApi<BalanceHistoryEntry[]>(
      `/balance-history?${new URLSearchParams(
        params as Record<string, string>
      )}`
    ),

  addEntry: (entry: Omit<BalanceHistoryEntry, "id">) =>
    fetchApi<BalanceHistoryEntry>("/balance-history", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
};

// Expenses API
export const expensesApi = {
  getCategories: () => fetchApi<ExpenseCategory[]>("/expenses/categories"),

  getSummary: (params?: { month?: string; year?: string }) =>
    fetchApi<{
      total: number;
      byCategory: Record<string, number>;
    }>(
      `/expenses/summary?${new URLSearchParams(
        params as Record<string, string>
      )}`
    ),
};

// Auth API (placeholder for future implementation)
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    fetchApi<{
      token: string;
      user: { id: string; name: string; email: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" }),

  refreshToken: () =>
    fetchApi<{ token: string }>("/auth/refresh", { method: "POST" }),
};
