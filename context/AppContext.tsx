import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  Transaction,
  BalanceHistoryEntry,
  AccountSummary,
  ExpenseCategory,
} from "../types";

// State interface
interface AppState {
  // Dashboard
  totalCapital: number;
  float: number;
  cash: number;
  outstanding: number;
  accounts: AccountSummary[];

  // Transactions
  transactions: Transaction[];

  // Balance History
  balanceHistory: BalanceHistoryEntry[];

  // Expenses
  expenseCategories: ExpenseCategory[];

  // UI State
  isLoading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "SET_DASHBOARD_SUMMARY";
      payload: {
        totalCapital: number;
        float: number;
        cash: number;
        outstanding: number;
      };
    }
  | { type: "SET_ACCOUNTS"; payload: AccountSummary[] }
  | { type: "SET_TRANSACTIONS"; payload: Transaction[] }
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "SET_BALANCE_HISTORY"; payload: BalanceHistoryEntry[] }
  | { type: "ADD_BALANCE_ENTRY"; payload: BalanceHistoryEntry }
  | { type: "SET_EXPENSE_CATEGORIES"; payload: ExpenseCategory[] }
  | { type: "RESET_STATE" };

// Initial state
const initialState: AppState = {
  totalCapital: 0,
  float: 0,
  cash: 0,
  outstanding: 0,
  accounts: [],
  transactions: [],
  balanceHistory: [],
  expenseCategories: [],
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_DASHBOARD_SUMMARY":
      return {
        ...state,
        totalCapital: action.payload.totalCapital,
        float: action.payload.float,
        cash: action.payload.cash,
        outstanding: action.payload.outstanding,
      };

    case "SET_ACCOUNTS":
      return { ...state, accounts: action.payload };

    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.payload };

    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };

    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };

    case "SET_BALANCE_HISTORY":
      return { ...state, balanceHistory: action.payload };

    case "ADD_BALANCE_ENTRY":
      return {
        ...state,
        balanceHistory: [action.payload, ...state.balanceHistory],
      };

    case "SET_EXPENSE_CATEGORIES":
      return { ...state, expenseCategories: action.payload };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
}

// Context
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use app context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// Action creators (helper functions)
export const appActions = {
  setLoading: (dispatch: React.Dispatch<AppAction>, isLoading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: isLoading });
  },

  setError: (dispatch: React.Dispatch<AppAction>, error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  },

  setDashboardSummary: (
    dispatch: React.Dispatch<AppAction>,
    summary: {
      totalCapital: number;
      float: number;
      cash: number;
      outstanding: number;
    }
  ) => {
    dispatch({ type: "SET_DASHBOARD_SUMMARY", payload: summary });
  },

  setAccounts: (
    dispatch: React.Dispatch<AppAction>,
    accounts: AccountSummary[]
  ) => {
    dispatch({ type: "SET_ACCOUNTS", payload: accounts });
  },

  setTransactions: (
    dispatch: React.Dispatch<AppAction>,
    transactions: Transaction[]
  ) => {
    dispatch({ type: "SET_TRANSACTIONS", payload: transactions });
  },

  addTransaction: (
    dispatch: React.Dispatch<AppAction>,
    transaction: Transaction
  ) => {
    dispatch({ type: "ADD_TRANSACTION", payload: transaction });
  },

  setBalanceHistory: (
    dispatch: React.Dispatch<AppAction>,
    history: BalanceHistoryEntry[]
  ) => {
    dispatch({ type: "SET_BALANCE_HISTORY", payload: history });
  },
};
