import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  persistStore,
  persistReducer,
  createTransform,
  type PersistConfig,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer, { clearLocalAuth } from "./slices/authSlice";
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
import accountTemplatesReducer from "./slices/accountTemplatesSlice";
import usersReducer from "./slices/usersSlice";
import auditLogsReducer from "./slices/auditLogsSlice";
import syncQueueReducer, {
  normalizeSyncQueueState,
  type SyncQueueState,
} from "./slices/syncQueueSlice";
import expectedCommissionsReducer from "./slices/expectedCommissionsSlice";
import commissionSchedulesReducer from "./slices/commissionSchedulesSlice";
import expenseCategoriesReducer from "./slices/expenseCategoriesSlice";
import tellersReducer from "./slices/tellersSlice";

const syncQueueTransform = createTransform(
  (inboundState: SyncQueueState) => inboundState,
  (outboundState: Partial<SyncQueueState> | undefined) =>
    normalizeSyncQueueState(outboundState),
  { whitelist: ["syncQueue"] },
);

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
  accountTemplates: accountTemplatesReducer,
  users: usersReducer,
  auditLogs: auditLogsReducer,
  syncQueue: syncQueueReducer,
  expectedCommissions: expectedCommissionsReducer,
  commissionSchedules: commissionSchedulesReducer,
  expenseCategories: expenseCategoriesReducer,
  tellers: tellersReducer,
});

type AppState = ReturnType<typeof appReducer>;

/**
 * Root reducer that resets slice state on local auth clear.
 * Re-authentication flows can opt into preserving the offline sync queue,
 * while full logout still resets everything.
 */
const rootReducer: typeof appReducer = (
  state: Parameters<typeof appReducer>[0],
  action: Parameters<typeof appReducer>[1],
) => {
  if (clearLocalAuth.fulfilled.match(action)) {
    const resetState = appReducer(undefined, action);
    const preservedSyncQueue =
      action.meta.arg?.preserveSyncQueue === true
        ? normalizeSyncQueueState(state?.syncQueue)
        : undefined;

    if (preservedSyncQueue !== undefined) {
      return {
        ...resetState,
        syncQueue: preservedSyncQueue,
      };
    }

    return resetState;
  }
  return appReducer(state, action);
};

// Persist config — only on mobile (web uses its own storage via authSlice)
const persistConfig: PersistConfig<AppState> = {
  key: "root",
  storage: AsyncStorage,
  transforms: [syncQueueTransform],
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
    "auditLogs",
    "syncQueue",
  ],
};

// Only use redux-persist on mobile
const maybePersistedReducer =
  Platform.OS === "web"
    ? rootReducer
    : persistReducer<AppState>(persistConfig, rootReducer);

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
