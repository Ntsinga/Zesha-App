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

### 2026-05-24 - Template rule editor treated slot changes as duplicate adds

- Status: Resolved
- Area: UI / State
- Symptoms: Editing a commission template rule from the account detail screen failed with `An active rule already exists for this (transaction_type, transaction_subtype)` even when the user intended to replace the existing withdraw or deposit rule with a new structure. In some cases the same conflict also appeared right after creating and linking a genuinely new schedule.
- Root cause: The rule editor always dispatched the add-rule thunk. The backend correctly allows only one active rule per `(transaction_type, transaction_subtype)` within a schedule and expects the existing slot to be revised instead. Company schedules already had a revise thunk, but template schedules did not, so the template path dead-ended on the duplicate-rule guard. Separately, the duplicate pre-check trusted `selectedSchedule` in Redux even when it was stale and no longer matched the account's currently linked schedule, so a newly created schedule could inherit a false duplicate conflict from previously selected state.
- Solution implemented:
  - Added `reviseCommissionTemplateRule` to the commission schedule slice.
  - Updated the account detail rule form to detect an existing active rule for the selected transaction slot.
  - Automatically dispatch the revise thunk instead of the add thunk when the user is replacing an existing active rule.
  - Scoped duplicate/revise checks to the currently linked schedule ID instead of any stale `selectedSchedule` state.
  - Cleared stale selected schedule detail when creating and linking a brand-new schedule.
  - Return a success message of `Rule revised.` so the UI reflects what actually happened.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on the touched frontend files.
- Lessons learned:
  - The UI should model the backend invariant of one active rule per transaction slot instead of surfacing the raw duplicate-rule conflict to the user.
  - Template and company schedule paths need the same mutation surface; missing one side creates confusing parity bugs.
  - If a form can represent both create and replace semantics, detect the existing slot locally and choose the correct mutation before making the API call.
  - Any duplicate pre-check in Redux must be scoped to the exact schedule currently being edited, not whichever schedule detail was last selected.

### 2026-05-24 - Account template slice split left stale selectors and template typing

- Status: Resolved
- Area: UI / State
- Symptoms: The frontend refactor that split template logic out of `accountsSlice` left the app in an inconsistent state. Template consumers still read from `state.accounts`, the new reducer was not registered in the store, and the web accounts screen typed the inherit source as `Account`, causing the TypeScript build to fail.
- Root cause: The slice separation landed in stages, but the follow-up rewiring across store registration, screen hooks, and the inheritance UI was incomplete. That left selectors and imports pointed at the old slice boundary, and one inheritance path still used the company-account type instead of `AccountTemplate`.
- Solution implemented:
  - Added `accountTemplates` to the Redux store.
  - Moved template imports and selectors in the account hooks and onboarding flow to `accountTemplatesSlice`.
  - Kept inherited company accounts syncing back into `accountsSlice` via the `inheritAccountTemplate.fulfilled` case.
  - Updated the web accounts screen so the selected inheritance source is typed as `AccountTemplate`.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on all touched frontend files with the error tool.
- Lessons learned:
  - When splitting a Redux domain, finish the store registration and all consumer rewires before treating the first slice extraction as complete.
  - Template entities and company accounts may look structurally similar, but the UI state that carries them across slice boundaries needs explicit types.
  - A quick grep for old selectors after a slice move is a cheap way to catch stale state paths before they become follow-up breakages.

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
