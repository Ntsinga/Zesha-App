import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboardSlice";
import transactionsReducer from "./slices/transactionsSlice";
import expensesReducer from "./slices/expensesSlice";
// New slices for FastAPI integration
import balancesReducer from "./slices/balancesSlice";
import commissionsReducer from "./slices/commissionsSlice";
import reconciliationsReducer from "./slices/reconciliationsSlice";
import companyInfoReducer from "./slices/companyInfoSlice";
import cashCountReducer from "./slices/cashCountSlice";
import accountsReducer from "./slices/accountsSlice";
import usersReducer from "./slices/usersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    transactions: transactionsReducer,
    expenses: expensesReducer,
    // New reducers for FastAPI integration
    balances: balancesReducer,
    commissions: commissionsReducer,
    reconciliations: reconciliationsReducer,
    companyInfo: companyInfoReducer,
    cashCount: cashCountReducer,
    accounts: accountsReducer,
    users: usersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ["auth/setUser"],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
