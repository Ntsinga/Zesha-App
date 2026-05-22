# Error Log

Use this file to track frontend and app issues, root causes, fixes, and validation.
Add new entries at the top so the most recent incidents stay visible.
Before starting work on a bug or incident, review the lessons in relevant past entries.

## Entry Template

### YYYY-MM-DD - Short Title

- Status: Open | Monitoring | Resolved
- Area: UI | State | Auth | Networking | Sync | Navigation | Build | Deployment
- Symptoms:
- Root cause:
- Solution implemented:
- Validation:
- Lessons learned:
- Notes:

## Incident Writing Standard

Use short, concrete bullets.
Write what happened, why it happened, what changed, how it was verified, and what the team should remember next time.

---

### 2026-05-22 - Blocked sync queue stayed stalled when auth recovered without a backend resync

- Status: Resolved
- Area: Sync / Auth
- Symptoms: Sentry still reported `Sync stalled: transaction blocked (HTTP 401)` on the mobile transactions screen after the user signed in again. The offline queue remained blocked even though a recovery path had already been added for re-authentication.
- Root cause: The earlier recovery only dispatched `resetBlockedItems()` after `syncUserWithBackend` fulfilled. In some re-auth flows, Clerk auth became valid again while the existing backend user already matched the same Clerk user, so `useClerkUserSync` skipped `syncUserWithBackend` entirely. That left blocked queue items in `blocked` forever because no recovery action fired in the already-synced path.
- Solution implemented:
  - Added a shared `resumeBlockedQueue` path in the native and web Clerk sync hooks.
  - Kept the existing unblock-on-success behavior after `syncUserWithBackend` fulfills.
  - Delayed updating `syncedClerkIdRef` until `syncUserWithBackend` actually fulfills, so a transient backend sync failure does not suppress later retry attempts for the same Clerk user.
  - Added recovery for the case where auth becomes available again and the backend user is already synced for the same Clerk user, so blocked items are reset to `pending` and `triggerSync()` runs immediately.
- Validation: TypeScript error checks passed for the updated native and web Clerk sync hooks. Reviewed the restored-auth control flow to confirm recovery now runs both after a fresh backend sync and after an already-synced session becomes available again.
- Lessons learned:
  - Do not couple queue recovery only to the backend sync thunk when auth state can also be restored from cached user state.
  - Any re-auth recovery must cover both "freshly resynced" and "already restored" authenticated states.
  - Do not mark a Clerk user as synced before the backend sync thunk succeeds, or a rejected sync can permanently short-circuit future retries.

### 2026-05-21 - Sync 422 diagnostics hid the missing transaction field

- Status: Resolved
- Area: Sync / Networking
- Symptoms: Offline transaction sync stalled on `POST /transactions/create` with HTTP 422. The queue UI and Sentry only showed `Field required`, which made it impossible to tell which request field was missing. The item was marked `failed` after a single attempt and blocked later queued items.
- Root cause: The backend already returned structured FastAPI validation details with `loc`, `msg`, and `type`, but `secureApiRequest` flattened array errors down to `msg` only. That discarded the field path, so both the in-app queue diagnostics and Sentry lost the actionable part of the 422.
- Solution implemented:
  - Updated `secureApiRequest` to format validation errors as `body.field_name: message` instead of only `message`.
  - Stored the raw validation detail on `ApiError` for richer downstream diagnostics.
  - Added the flattened sync error text to Sentry `syncItem` context so replay events retain the field-level failure detail.
  - Added a sanitized `requestPayload` Sentry context for sync stalls so failed offline mutations expose the outgoing body, body size, and local image count without logging base64 image blobs.
- Validation: TypeScript error check passed for the touched frontend file. Reviewed the backend validation handler and confirmed it already returns `loc`, so the missing detail was lost only in the frontend formatter.
- Lessons learned:
  - For FastAPI 422s, never discard `loc`; `msg` alone is too generic to debug queue failures.
  - Queue-head failures need field-level diagnostics because a single deterministic 4xx blocks later items by design.
  - A pending row can look valid in the UI while still hiding the exact malformed field, so preserve server validation structure in logs.
  - Capture request payloads at the sync boundary instead of enabling global request-body logging on the server; that keeps diagnostics targeted and avoids broad PII exposure.

### 2026-05-20 - Blocked sync items never retried after re-authentication

- Status: Resolved
- Area: Sync / Auth
- Symptoms: Sentry event `Sync stalled: transaction blocked (HTTP 401)` for route `/transactions`. After the user signed back in, the queued transaction was still not synced. Sentry tag `sync.status: blocked`.
- Root cause: `processItem` in `syncEngine.ts` marks items `"blocked"` on 401/403. `isProcessableItem` excludes `"blocked"` status, so blocked items are never retried. There was no code to reset blocked items to `"pending"` after a successful re-authentication — the `useClerkUserSync` hook called `syncUserWithBackend` but did nothing with its result.
- Solution implemented:
  - Added `resetBlockedItems` reducer to `syncQueueSlice` that sets all `"blocked"` items back to `"pending"`.
  - In `useClerkUserSync.ts`, after `dispatch(syncUserWithBackend(...))`, checked for `fulfilled` and dispatched `resetBlockedItems()` + called `triggerSync()` so the sync engine immediately processes the recovered items.
- Validation: No TypeScript errors. Logic reviewed — `triggerSync` is a no-op if already processing or offline, so it is safe to call eagerly.
- Lessons learned:
  - Any time a queue item transitions to a terminal-like status (`"blocked"`, `"failed"`), there must be a recovery path that is triggered by the event that resolves the underlying cause (re-auth, manual retry, etc.).
  - Always check what happens to the sync queue _after_ the fix event (sign-in), not just during the failure.
  - `syncUserWithBackend` succeeding is the signal that auth is restored — couple queue unblocking to that, not to connectivity events.

---

### Example

- Status: Resolved
- Area: UI / State
- Symptoms: A controlled amount input removed a trailing decimal while the user was still typing.
- Root cause: The component converted the in-progress string value to a number on every change, so `1000.` was normalized to `1000` during re-render.
- Solution implemented: Store the draft input as a string while editing, convert only when committing, and preserve intermediate values like `""` and `"."`.
- Validation: Verified typing flows on mobile and web, confirmed the displayed value preserves intermediate input states, and ran the relevant frontend error checks.
- Lessons learned: Controlled numeric inputs need explicit support for intermediate string states. Do not coerce user input to a number on every keystroke.
- Notes: If this recurs, inspect the component state shape before changing formatter utilities.

## Incidents
