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
