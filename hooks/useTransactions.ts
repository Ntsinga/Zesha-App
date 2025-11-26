import { useState, useCallback } from "react";
import { Transaction } from "../types";
import { transactionsApi } from "../services/api";
import { useApp, appActions } from "../context/AppContext";
import { MOCK_TRANSACTIONS } from "../constants";

interface UseTransactionsReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

// Flag to use mock data during development
const USE_MOCK_DATA = true;

export function useTransactions(): UseTransactionsReturn {
  const { state, dispatch } = useApp();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    appActions.setLoading(dispatch, true);

    try {
      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        appActions.setTransactions(dispatch, MOCK_TRANSACTIONS);
      } else {
        const response = await transactionsApi.getAll();
        appActions.setTransactions(dispatch, response.data);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch transactions";
      setLocalError(errorMessage);
      appActions.setError(dispatch, errorMessage);
    } finally {
      setLocalLoading(false);
      appActions.setLoading(dispatch, false);
    }
  }, [dispatch]);

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id">) => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        if (USE_MOCK_DATA) {
          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 300));
          const newTransaction: Transaction = {
            ...transaction,
            id: "txn_" + Date.now(),
          };
          appActions.addTransaction(dispatch, newTransaction);
        } else {
          const newTransaction = await transactionsApi.create(transaction);
          appActions.addTransaction(dispatch, newTransaction);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add transaction";
        setLocalError(errorMessage);
        throw error;
      } finally {
        setLocalLoading(false);
      }
    },
    [dispatch]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const existingTransaction = state.transactions.find(
            (t) => t.id === id
          );
          if (existingTransaction) {
            dispatch({
              type: "UPDATE_TRANSACTION",
              payload: { ...existingTransaction, ...updates },
            });
          }
        } else {
          const updatedTransaction = await transactionsApi.update(id, updates);
          dispatch({ type: "UPDATE_TRANSACTION", payload: updatedTransaction });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update transaction";
        setLocalError(errorMessage);
        throw error;
      } finally {
        setLocalLoading(false);
      }
    },
    [dispatch, state.transactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          dispatch({ type: "DELETE_TRANSACTION", payload: id });
        } else {
          await transactionsApi.delete(id);
          dispatch({ type: "DELETE_TRANSACTION", payload: id });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete transaction";
        setLocalError(errorMessage);
        throw error;
      } finally {
        setLocalLoading(false);
      }
    },
    [dispatch]
  );

  const refreshTransactions = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions: state.transactions,
    isLoading: localLoading || state.isLoading,
    error: localError || state.error,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
  };
}
