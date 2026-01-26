# Zesha App - GitHub Copilot Instructions

## Project Overview

Zesha is a React Native/Expo application with web support for financial reconciliation and balance tracking. It uses a FastAPI backend with PostgreSQL.

## Architecture

### Frontend Stack

- **Framework**: React Native with Expo Router
- **State Management**: Redux Toolkit with typed async thunks
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Authentication**: Clerk (@clerk/clerk-expo for native, @clerk/clerk-react for web)
- **Platform Files**: Use `.native.tsx`, `.web.tsx` extensions for platform-specific code

### Backend Stack

- **API**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Naming**: snake_case for all backend models and endpoints

---

## TypeScript Best Practices

### ALWAYS Use Strong Typing

1. **Never use `any` type**

   ```typescript
   // ❌ BAD
   const data: any = response.json();

   // ✅ GOOD
   const data: User = await response.json();
   ```

2. **Type all async thunks with generics**

   ```typescript
   // ❌ BAD
   export const fetchUsers = createAsyncThunk(
     "users/fetch",
     async (_, { getState }) => {
       const state = getState() as any;
     },
   );

   // ✅ GOOD
   export const fetchUsers = createAsyncThunk<
     User[], // Return type
     UserFilters, // Argument type
     { state: RootState; rejectValue: string } // ThunkAPI config
   >("users/fetch", async (filters, { getState, rejectWithValue }) => {
     const state = getState(); // Properly typed!
   });
   ```

3. **Import types from the types directory**

   ```typescript
   import type { User, UserCreate, UserFilters } from "@/types";
   ```

4. **Use interfaces for all API payloads**

   ```typescript
   // Define in types/user.ts
   export interface UserCreate {
     email: string;
     firstName?: string;
     lastName?: string;
   }

   // Use in API calls
   async function createUser(data: UserCreate): Promise<User> {
     // ...
   }
   ```

---

## Naming Conventions

### Frontend (TypeScript/React)

- **Variables/Functions**: camelCase (`userName`, `fetchBalances`)
- **Interfaces/Types**: PascalCase (`UserCreate`, `BalanceFilters`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`, `DENOMINATIONS`)
- **Components**: PascalCase (`BottomNav`, `TopBar`)
- **Files**: camelCase for utilities, PascalCase for components

### Backend (Python)

- **Variables/Functions**: snake_case (`user_name`, `fetch_balances`)
- **Classes**: PascalCase (`UserCreate`, `BalanceFilters`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

### API Communication

- Frontend sends: snake_case (converted via `mapApiRequest`)
- Backend receives: snake_case
- Backend sends: snake_case
- Frontend receives: Converted to camelCase (via `mapApiResponse`)

---

## Type Directory Structure

```
types/
├── index.ts        # Barrel exports all types
├── enums.ts        # ShiftEnum, StatusEnum, etc.
├── base.ts         # BaseModel, ApiError, etc.
├── user.ts         # User, UserCreate, UserUpdate, etc.
├── account.ts      # Account types
├── balance.ts      # Balance types
├── commission.ts   # Commission types
├── expense.ts      # Expense types
├── cashCount.ts    # CashCount types
├── reconciliation.ts # Reconciliation types
├── company.ts      # CompanyInfo types
├── dashboard.ts    # Dashboard-specific UI types
└── mappers.ts      # snake_case ↔ camelCase converters
```

---

## Redux Slice Pattern

Every slice should follow this pattern:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { Entity, EntityCreate, EntityFilters } from "@/types";

// State interface
export interface EntityState {
  items: Entity[];
  selectedItem: Entity | null;
  isLoading: boolean;
  error: string | null;
}

// Typed async thunk
export const fetchEntities = createAsyncThunk<
  Entity[],
  EntityFilters,
  { state: RootState; rejectValue: string }
>("entity/fetchAll", async (filters, { getState, rejectWithValue }) => {
  try {
    const { auth } = getState();
    const companyId = auth.user?.companyId;
    // ... fetch logic
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed");
  }
});
```

---

## API Service Pattern

```typescript
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import type { User, UserCreate, UserFilters } from "@/types";

export async function fetchUsers(filters: UserFilters): Promise<User[]> {
  const query = buildTypedQueryString(filters);
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.users.list}${query}`,
  );
  const data = await response.json();
  return mapApiResponse<User[]>(data);
}

export async function createUser(user: UserCreate): Promise<User> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.sync}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapApiRequest(user)),
  });
  const data = await response.json();
  return mapApiResponse<User>(data);
}
```

---

## Component Guidelines

1. **Always type props**

   ```typescript
   interface ButtonProps {
     label: string;
     onPress: () => void;
     variant?: "primary" | "secondary";
   }

   export function Button({
     label,
     onPress,
     variant = "primary",
   }: ButtonProps) {
     // ...
   }
   ```

2. **Use typed hooks**

   ```typescript
   import { useAppDispatch, useAppSelector } from "@/store/hooks";

   const dispatch = useAppDispatch();
   const user = useAppSelector((state) => state.auth.user);
   ```

3. **Handle loading/error states**

   ```typescript
   const { items, isLoading, error } = useAppSelector((state) => state.balances);

   if (isLoading) return <LoadingSpinner />;
   if (error) return <ErrorMessage message={error} />;
   return <BalanceList items={items} />;
   ```

---

## Multi-Tenant Pattern

All data queries MUST include `companyId`:

```typescript
// ❌ BAD - Missing company filter
const balances = await fetchBalances({ dateFrom, dateTo });

// ✅ GOOD - Includes company filter
const companyId = getState().auth.user?.companyId;
if (!companyId) {
  return rejectWithValue("No company_id found");
}
const balances = await fetchBalances({ companyId, dateFrom, dateTo });
```

---

## File Organization

```
app/                    # Expo Router screens
├── (app)/             # Authenticated routes
│   ├── _layout.tsx    # App layout with navigation
│   ├── index.tsx      # Dashboard
│   └── [screen].tsx   # Feature screens
├── (auth)/            # Auth routes
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── _layout.tsx        # Root layout with providers

components/            # Reusable UI components
hooks/                 # Custom hooks
├── screens/          # Screen-specific hooks
└── useX.ts           # Shared hooks

services/             # API services
store/                # Redux store
├── slices/           # Feature slices
├── hooks.ts          # Typed dispatch/selector
└── index.ts          # Store configuration

types/                # TypeScript types (NEW structure)
config/               # App configuration
utils/                # Utility functions
```

---

## Quick Reference

| Task        | Import From                |
| ----------- | -------------------------- |
| Types       | `@/types` or `../../types` |
| Redux hooks | `@/store/hooks`            |
| API config  | `@/config/api`             |
| Formatters  | `@/utils/formatters`       |

| Pattern      | Example                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| Async thunk  | `createAsyncThunk<Return, Arg, { state: RootState; rejectValue: string }>` |
| Selector     | `useAppSelector((state) => state.slice.field)`                             |
| Dispatch     | `dispatch(fetchItems(filters))`                                            |
| API response | `mapApiResponse<Type>(data)`                                               |

---

## Development Workflow

### After Completing Tasks

**ALWAYS run error checks after completing any task:**

1. Use the error checking tool to verify no TypeScript/compilation errors
2. Review and fix any errors in user code (ignore `node_modules` errors)
3. Confirm successful completion only after error check passes

This ensures code quality and prevents broken deployments.
