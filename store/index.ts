import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import syncQueueReducer from "./slices/syncQueueSlice";

const appReducer = combineReducers({
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
  syncQueue: syncQueueReducer,
});

/**
 * Root reducer that resets ALL slice state on logout.
 * Each slice receives `undefined` → returns its own initialState,
 * then the clearLocalAuth.fulfilled action also fires in authSlice's
 * extraReducers to clean up auth-specific fields.
 */
const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === "auth/clearLocal/fulfilled") {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

// Persist config — only on mobile (web uses its own storage via authSlice)
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  // Persist data slices for offline access (auth uses SecureStore separately)
  whitelist: [
    "balances",
    "commissions",
    "expenses",
    "cashCount",
    "reconciliations",
    "accounts",
    "companyInfo",
    "dashboard",
    "syncQueue",
  ],
};

// Only use redux-persist on mobile
const maybePersistedReducer =
  Platform.OS === "web" ? rootReducer : persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: maybePersistedReducer as typeof rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions and auth actions for serialization checks
        ignoredActions: [
          "auth/setUser",
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
      },
    }),
});

// Persistor — only meaningful on mobile
export const persistor = Platform.OS === "web" ? null : persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
