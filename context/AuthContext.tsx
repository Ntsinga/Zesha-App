import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

// User interface
interface User {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

// Auth state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Action types
type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "RESTORE_TOKEN"; payload: { user: User; token: string } | null };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case "RESTORE_TOKEN":
      return {
        ...state,
        user: action.payload?.user || null,
        token: action.payload?.token || null,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
}

// Context
interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Secure storage keys
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore token on app start
  useEffect(() => {
    async function restoreToken() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userJson = await SecureStore.getItemAsync(USER_KEY);

        if (token && userJson) {
          const user = JSON.parse(userJson);
          dispatch({ type: "RESTORE_TOKEN", payload: { user, token } });
        } else {
          dispatch({ type: "RESTORE_TOKEN", payload: null });
        }
      } catch (error) {
        console.error("Error restoring token:", error);
        dispatch({ type: "RESTORE_TOKEN", payload: null });
      }
    }

    restoreToken();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      // TODO: Replace with actual API call
      // const response = await authApi.login({ email, password });

      // Mock successful login for development
      const mockUser: User = {
        id: "1",
        name: "Test User",
        email: email,
        companyName: "Company Name",
      };
      const mockToken = "mock_token_" + Date.now();

      // Store in secure storage
      await SecureStore.setItemAsync(TOKEN_KEY, mockToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(mockUser));

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: mockUser, token: mockToken },
      });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Login failed",
      });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Error during logout:", error);
      dispatch({ type: "LOGOUT" });
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: "SET_ERROR", payload: null });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
