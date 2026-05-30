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

### 2026-05-30 - Android Sentry mobile replay could ANR on foreground resume

- Status: Resolved
- Area: Build / Navigation
- Symptoms: Production Android sessions on low-end devices (itel P10004L, dist:6) could hit an `ApplicationNotResponding` fatal shortly after returning to the app from the background on `/transactions`. The stack never entered app screen code; it blocked on the main thread inside `io.sentry.android.replay.ReplayIntegration.resumeInternal` and `AndroidConnectionStatusProvider.getConnectionStatus` during lifecycle foreground start.
- Root cause: `config/sentry.ts` enabled `Sentry.mobileReplayIntegration()` unconditionally for native Android. On low-end Android devices, Sentry's replay resume path could block the main thread while reacquiring its connection-status cache lock during app foreground lifecycle events, causing an ANR before the transactions screen could resume normally.
- Solution implemented:
  - Disabled Sentry mobile replay on Android by gating `Sentry.mobileReplayIntegration()` behind `Platform.OS !== "android"`.
  - Set Android replay sampling to `0` so the native replay lifecycle path is not activated on Android while leaving navigation tracing, feedback, and non-replay crash reporting intact.
- Validation: `get_errors` reported no errors in `config/sentry.ts`, `npm exec -- tsc --noEmit` completed cleanly in `Zesha-App`, and the final `config/sentry.ts` readback confirmed Android now skips the replay integration and replay sample rates.
- Lessons learned:
  - If an ANR stack is entirely inside Sentry/SDK lifecycle code, treat the observability integration as a likely root cause before debugging screen components.
  - Mobile replay is optional; on low-end Android devices it is not worth keeping enabled if it risks blocking app foreground resume.
  - Route tags on an ANR can reflect the last active screen even when the freeze happens in process-lifecycle startup code, so stack ownership matters more than the route label.

### 2026-05-29 - Auth recovery handler re-entered loop on sign-in (dist:6 regression)

- Status: Resolved
- Area: Navigation / Auth
- Symptoms: `Maximum update depth exceeded` on `/sign-in` in production (dist:6), reproducible on low-end Android devices (itel P10004L). Sentry stack pointed into `@react-navigation/core/useSyncState.js` `batchUpdates` during `commitHookEffectListMount` — a layout-effect update loop triggered on sign-in screen mount.
- Root cause: Two compounding bugs in the `registerAuthRecoveryHandler` effect in the native root layout:
  1. `router` was included in the effect deps. Because `router` (from `useRouter()`) changes reference on every navigation state change, the effect cleanup ran on every navigation event — resetting `authRecoveryInProgressRef.current = false` and defeating the re-entry guard.
  2. The `finally` block called `router.replace("/(auth)/sign-in")` unconditionally, even when already on the sign-in page. That navigation event changed the `router` reference, triggering cleanup (bug 1), allowing the next 401 from a stale sync-queue request to retrigger the handler and fire another replace — creating the loop.
- Solution implemented:
  - Added a `pathnameRef` (updated on every render via a dep-less `useEffect`) so the handler can read the current pathname without capturing a stale closure.
  - Guarded the `finally` block: `router.replace("/(auth)/sign-in")` is now skipped when `pathnameRef.current` already contains an auth-page path.
  - Removed `router` from the `registerAuthRecoveryHandler` effect deps, consistent with the existing comment on the auth navigation effect, so cleanup no longer resets the guard on every navigation event.
- Validation: No TypeScript errors on the edited file.
- Lessons learned:
  - Any `useEffect` that registers a callback containing a `router.replace` call must NOT include `router` in its deps — the reference changes on every navigation event, causing cleanup and guard-reset churn.
  - `router.replace(X)` called from screen X still fires a navigation event in Expo Router. Always guard navigation calls with a pathname check to avoid self-replace loops.
  - Re-entry guards (`useRef` flags) are only effective if the effect cleanup that resets them is scoped to meaningful dep changes (not stable-but-changing refs like `router`).

### 2026-05-27 - Native auth layout could loop redirects on the sign-in screen

- Status: Resolved (partial — regression introduced in dist:6, see entry above)
- Area: Navigation / Auth
- Symptoms: Production Android sessions could hit `Maximum update depth exceeded` on the sign-in route. Sentry stacks pointed into React Navigation store updates during mount, consistent with repeated navigation state updates.
- Root cause: The native root layout decided whether the user was already on an auth screen primarily from `useSegments()`. On sign-in and related auth routes, that detection was not defensive enough, so the auth gate could repeatedly call `router.replace("/(auth)/sign-in")` or bounce away from auth pages during route-state churn, creating a navigation update loop.
- Solution implemented:
  - Switched the native auth gate to derive auth-page status from `usePathname()` for sign-in, sign-up, welcome, forgot-password, and set-password routes.
  - Used that pathname-based auth-page guard to suppress self-redirects back to sign-in and only redirect signed-in users away from auth pages when appropriate.
- Validation: Ran editor diagnostics on the edited native layout with no errors and `npm exec -- tsc --noEmit` in `Zesha-App` completed cleanly after the redirect-guard change.
- Lessons learned:
  - Route-group metadata is not a robust sole source of truth for redirect guards on auth screens.
  - Redirect effects should always guard against targeting the route that is already active.

### 2026-05-26 - Dashboard commission donut hid all but the current shift

- Status: Resolved
- Area: UI / State
- Symptoms: The dashboard commission donut and total could drop to a single account even when the same dashboard showed many transactions across several accounts for the selected day. Browser network traces showed `/expected-commissions/breakdown` returning only one account because the request included `shift=PM`.
- Root cause: `useDashboardScreen` sent `currentShift` to the expected-commission totals and breakdown endpoints, but the dashboard UI presents "Today", "Last 7 Days", and similar whole-period filters and does not expose an AM/PM selector. The commission widgets were therefore filtered to the current shift while the adjacent transaction widgets were not.
- Solution implemented:
  - Removed the implicit shift filter from dashboard commission totals and breakdown requests.
  - Kept the dashboard commission charts aligned with the selected date range instead of the current clock shift.
- Validation: Confirmed the dashboard hook no longer appends `shift` to the commission aggregate requests and ran diagnostics on the edited frontend file with no errors.
- Lessons learned:
  - If a dashboard card represents a whole selected period, its backend query must not apply a hidden narrower filter.
  - Network traces are the fastest way to distinguish "wrong aggregation" from "wrong filter" when chart totals look inconsistent.

### 2026-05-25 - Sync engine could send secure requests without a bearer token

- Status: Resolved
- Area: Sync / Auth
- Symptoms: A queued transaction on the mobile transactions screen stalled with `header.authorization: Field required` and surfaced as a failed transaction instead of an auth recovery path. The UI looked signed in, but the sync request reached the backend without an `Authorization` header.
- Root cause: `initializeSecureApi(getToken)` only registered Clerk's token getter, and `isSecureApiInitialized()` only checked whether that getter existed. `secureApiRequest` and `secureRequest` still sent requests when `getToken()` returned `null` or token retrieval failed, so the client crossed the network boundary without a bearer token. The sync engine then only saw the backend's response and could at best reclassify it after the fact.
- Solution implemented:
  - Changed `secureApiRequest` and `secureRequest` to fail closed instead of sending tokenless requests.
  - Added one immediate retry when Clerk token retrieval returns `null` or throws, so a brief token-fetch wobble does not immediately force sign-out.
  - Introduced a global auth recovery handler in `services/secureApi.ts` so any `401` or `AUTH_TOKEN_UNAVAILABLE` from the secure API layer routes through the same sign-out and redirect flow, not just sync-queue failures.
  - Removed the manual transaction-screen sign-in actions so expired sessions redirect automatically instead of asking the user what to do.
- Validation: Re-read the edited auth client, native root layout, web root layout, and sync engine control flow and ran diagnostics on those files with no errors.
- Lessons learned:
  - "Secure API initialized" is not the same as "a usable bearer token exists for this request".
  - Authenticated clients should fail closed at the request boundary; they should never silently downgrade to unauthenticated network calls.
  - Queue recovery logic should classify auth failures, but session-expiry recovery should live at the shared API boundary so foreground requests and queued requests behave the same way.

### 2026-05-24 - Agency account schedule UI hid template schedules and misresolved detail

- Status: Resolved
- Area: UI / State
- Symptoms: Agency admins could only assign company-owned commission schedules from the account screens even though the backend allowed system template schedules too. Accounts already linked to a template schedule also risked loading commission detail through the company-only fetch path.
- Root cause: Agency account hooks and web selectors only loaded `commissionSchedules.items`, which excludes system templates. The detail loader also assumed company ownership on the first fetch attempt instead of supporting the backend's template route.
- Solution implemented:
  - Load commission template schedules alongside company schedules in agency account flows.
  - Combine both schedule lists for agency account selectors and display labels.
  - Make schedule detail fetching fall back to the template endpoint when the company-scoped lookup does not own the schedule.
  - Update shared commission rule typing so template rules can carry `companyId = null` safely in frontend state.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on the touched frontend files.
- Lessons learned:
  - If the backend allows system templates in tenant flows, the frontend options list and detail fetch path must both model that mixed ownership case.
  - Company schedule summaries and template schedule details are different data shapes, so mixed-source selectors need an explicit resolution strategy.

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
