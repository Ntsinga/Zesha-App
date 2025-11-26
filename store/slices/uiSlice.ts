import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Types
export type ModalType =
  | "addTransaction"
  | "addBalance"
  | "editTransaction"
  | "editBalance"
  | "settings"
  | "profile"
  | null;

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export interface UIState {
  activeModal: ModalType;
  modalData: unknown;
  toasts: Toast[];
  isSidebarOpen: boolean;
  isRefreshing: boolean;
  theme: "light" | "dark" | "system";
}

const initialState: UIState = {
  activeModal: null,
  modalData: null,
  toasts: [],
  isSidebarOpen: false,
  isRefreshing: false,
  theme: "light",
};

// Slice
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openModal: (
      state,
      action: PayloadAction<{ type: ModalType; data?: unknown }>
    ) => {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data ?? null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    addToast: (state, action: PayloadAction<Omit<Toast, "id">>) => {
      state.toasts.push({
        ...action.payload,
        id: Date.now().toString(),
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(
        (toast) => toast.id !== action.payload
      );
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark" | "system">) => {
      state.theme = action.payload;
    },
  },
});

export const {
  openModal,
  closeModal,
  addToast,
  removeToast,
  clearToasts,
  toggleSidebar,
  setSidebarOpen,
  setRefreshing,
  setTheme,
} = uiSlice.actions;
export default uiSlice.reducer;
