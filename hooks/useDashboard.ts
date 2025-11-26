import { useState, useCallback } from "react";
import { AccountSummary } from "../types";
import { dashboardApi } from "../services/api";
import { useApp, appActions } from "../context/AppContext";
import { MOCK_ACCOUNTS } from "../constants";

interface DashboardSummary {
  totalCapital: number;
  float: number;
  cash: number;
  outstanding: number;
}

interface UseDashboardReturn {
  summary: DashboardSummary;
  accounts: AccountSummary[];
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

// Flag to use mock data during development
const USE_MOCK_DATA = true;

// Mock dashboard summary
const MOCK_SUMMARY: DashboardSummary = {
  totalCapital: 50000.0,
  float: 12345.67,
  cash: 15500,
  outstanding: 22100,
};

export function useDashboard(): UseDashboardReturn {
  const { state, dispatch } = useApp();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    appActions.setLoading(dispatch, true);

    try {
      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        appActions.setDashboardSummary(dispatch, MOCK_SUMMARY);
        appActions.setAccounts(dispatch, MOCK_ACCOUNTS);
      } else {
        const [summaryResponse, accountsResponse] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getAccounts(),
        ]);
        appActions.setDashboardSummary(dispatch, summaryResponse);
        appActions.setAccounts(dispatch, accountsResponse);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data";
      setLocalError(errorMessage);
      appActions.setError(dispatch, errorMessage);
    } finally {
      setLocalLoading(false);
      appActions.setLoading(dispatch, false);
    }
  }, [dispatch]);

  const refreshDashboard = useCallback(async () => {
    await fetchDashboard();
  }, [fetchDashboard]);

  const summary: DashboardSummary = {
    totalCapital: state.totalCapital,
    float: state.float,
    cash: state.cash,
    outstanding: state.outstanding,
  };

  return {
    summary,
    accounts: state.accounts,
    isLoading: localLoading || state.isLoading,
    error: localError || state.error,
    fetchDashboard,
    refreshDashboard,
  };
}
