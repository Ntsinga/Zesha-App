# Zesha App - GitHub Copilot Instructions

## Project Overview

Zesha is a React Native/Expo application with web support for financial reconciliation and balance tracking. It uses a FastAPI backend with PostgreSQL.

## Issue Learning Workflow

- Before making changes for a bug, regression, outage, unexpected frontend behavior, or any task where execution failures could affect the result, read `ERROR_LOG.md` and review lessons from relevant past incidents.
- Use `ERROR_LOG.md` as the single chronological incident log for both product issues and task-execution failures. Do not create a separate failure log unless the user explicitly asks for one; a unified log is easier to mine later for harnesses because product regressions, tooling failures, validation misses, and asset-pipeline mistakes often interact.
- Every time a meaningful problem is discovered, document it in `ERROR_LOG.md` with the symptoms, root cause, solution implemented, validation performed, and lessons learned.
- Log task-execution failures even if the final user-facing result is fixed. This includes failed commands, broken generated assets, wrong file paths, stale cache issues, file locks, incorrect assumptions, validation gaps, accidental temporary files in shipping locations, or any tool/process failure that changed how the task had to be completed.
- Classify each new entry clearly in the `Area` field, using values such as `UI`, `State`, `Auth`, `Networking`, `Sync`, `Navigation`, `Build`, `Deployment`, `Assets`, `Tooling`, `Validation`, or `Task Execution` as appropriate.
- After fixing an issue or recovering from a task-execution failure, update `ERROR_LOG.md` so the lessons from that incident can be used to avoid repeating the same mistake.
- **After any logo/icon design improvement** (new polish technique, depth tuning, contamination rule change, lettermark quality fix), update `.github/agents/logo-designer.agent.md` with the lesson so the Logo Designer agent can reproduce the quality in future sessions. Do not skip this step — it is as mandatory as updating `ERROR_LOG.md` for bugs.

## External Assets

- When the user provides an external asset path outside the workspace and moving or copying it into the repo would make the task easier or more reproducible, ask for permission and then move or copy it into the relevant project asset folder before processing it.

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

> **NON-NEGOTIABLE**: This review-fix cycle is mandatory after EVERY task, no matter how small. Do not skip, abbreviate, or defer any step. If any step in these instructions was not followed during the task, immediately run `npx tsc --noEmit` on the full project and read every changed file before confirming completion.

**ALWAYS follow this review-fix cycle after completing any task:**

1. **Run `npx tsc --noEmit` on the full project** — not just the changed files. Capture all output and read every error line. Do not assume no errors exist.
2. **Read the actual changed code** — use `read_file` on every modified file. Do not rely on memory of what you intended to write.
3. Review each file for:
   - Logic bugs (e.g. type mismatches — storing a string-in-progress like `"1000."` into a `number` field)
   - Missing edge cases (empty string, `"."`, `NaN`, `null`, `undefined`, `0` as falsy)
   - JSX structure bugs (sibling elements in `.map()` without a single parent, missing keys, etc.)
   - State management issues in controlled inputs (intermediate typing state lost on re-render)
   - Security issues (unvalidated input reaching API, XSS, etc.)
4. Fix every issue found
5. **Re-run `npx tsc --noEmit` and re-read the fixed code** — confirm zero errors before proceeding
6. Repeat steps 3–5 until there are zero errors and no remaining issues
7. Read the relevant lessons in `ERROR_LOG.md` again and confirm the final change does not repeat a previously documented mistake
8. If the task involved a bug, regression, outage, misconfiguration, or unexpected behavior, add or update the matching entry in `ERROR_LOG.md` before confirming completion
9. Only confirm successful completion after the cycle is clean

**If any instruction in this file was skipped during the task** — stop, acknowledge it explicitly, then:
1. Identify exactly which instruction was skipped and why it was easy to miss or bypass.
2. Strengthen that specific instruction in this file — make it harder to skip by adding emphasis, a concrete example of the failure it prevents, or an explicit trigger condition.
3. Only respond to the user after both the fix and the instruction improvement are done.

**Common pitfalls**:
- Running `get_errors` on individual files is NOT the same as `npx tsc --noEmit` on the full project. Cross-file type errors (e.g. JSX siblings in `.map()`, union type property mismatches) only surface in a full compilation pass.
- Running only the TypeScript error checker is NOT sufficient. TypeScript cannot catch runtime logic bugs like `Number("1000.") === 1000` causing a controlled input to swallow a trailing decimal point. Always do the manual logic review in step 3.

This ensures code quality and prevents broken deployments.
