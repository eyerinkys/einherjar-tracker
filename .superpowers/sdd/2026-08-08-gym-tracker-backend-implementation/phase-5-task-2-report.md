# Phase 5 Task 2 Report — Persisted History UI Integration

## Status

Implemented the Phase 5 application-hydration and UI half on top of reviewed backend commit `0eddb30`. The existing Norse charcoal/bone/moss application structure remains intact. No hosted data, schema, migration, deployment, Phase 6 progression formula, Phase 7 PR/chart replacement, or Phase 8 real-AI behavior was touched.

## Implementation

### Protected server hydration

- The authenticated root starts exercise-library, split, active-workout, and completed-history page reads without an avoidable waterfall.
- The initial exercise-history request depends only on the exercise-library result and begins for the first visible exercise as soon as that result resolves.
- Every query receives the trusted authenticated user ID. Client-callable history actions receive only cursor/page-size or exercise ID inputs; no user ID is serialized into an action input.
- `ApplicationShell` receives `CompletedWorkoutHistoryPage` and `ExerciseHistory | null` DTOs and passes them to the owning screens.

### History ledger

- Replaced the legacy `getWorkoutHistory()` fixture boundary with the server-provided factual completed-session page.
- Preserved the collapsed/expanded ledger treatment and existing empty-state direction.
- Renders snapshot split/exercise names, target sets/reps, session and exercise notes, derived duration, completed sets, and recorded weighted volume.
- Uses `Intl.DateTimeFormat` on each UTC ISO timestamp so the displayed calendar day follows the browser's local time zone rather than slicing the UTC string.
- Displays nullable weights as `Bodyweight × reps`; it never renders `nullkg`, synthetic zero load, or fabricated volume.
- Uses session, session-exercise, and set database IDs as React keys.
- Cursor pagination uses a synchronous request lock plus disabled/loading UI, appends only unseen database session IDs, advances only to the authoritative returned cursor, retains the prior page/cursor on action or transport failure, and retries the same cursor through a safe inline recovery control.
- Added `min-w-0`, wrapping, tabular numerals, and 44px interactive heights to protect long names, notes, summary facts, and controls on narrow layouts.

### Exercise Detail factual history

- Hydrates the first visible exercise from the server and loads later selections with `getExerciseWorkoutHistory({ exerciseId })`.
- Removed the mock progression table that previously presented itself as the Historical Session Ledger. Later-phase mock PR, progression chart, and AI panels remain unchanged.
- The new factual ledger renders chronological server DTO sessions, local dates, snapshot targets/names/notes, completed sets, and bodyweight loads with stable database keys.
- Switching changes the selector immediately but never displays the prior exercise's ledger under the new label.
- A monotonically increasing request ID prevents a slower older response from overwriting the current selection. The selector remains usable while a request is pending.
- Empty, loading, action-error, transport-error, and retry states are scoped to the selected exercise. UI errors are fixed safe copy and do not render action/database/ownership details.

### Train previous performance and completion refresh

- Added `setNumber` to `PreviousPerformanceSet` and retained it in the existing history mapper. This additive DTO field is required to distinguish a missing previous set position from a later completed set.
- Train now matches prior performance by database set position instead of array index. Weighted and nullable bodyweight values render immediately; a missing position keeps the incumbent `First set` fallback and does not shift later results.
- Successful completion keeps the existing completion success state and calls `router.refresh()` so server history props can reconcile to the completed session.

### Mock boundary

- Removed the production `getWorkoutHistory()` export and its `MOCK_HISTORY_SESSIONS`/`CompletedSession` imports from `dataService`.
- Removed the application-shell call/import.
- Retained the mock workout fixture file because it is unrelated test/legacy fixture data and the brief explicitly prohibited broad fixture cleanup.

## Files

### Production

- `src/app/page.tsx`
- `src/components/app/ApplicationShell.tsx`
- `src/components/screens/HistoryView.tsx`
- `src/components/screens/ExerciseDetailView.tsx`
- `src/components/screens/TrainView.tsx`
- `src/components/ui/SetEntry.tsx`
- `src/server/queries/history.ts`
- `src/services/dataService.ts`
- `src/types/workout.ts`
- `src/data/mock/workouts.ts` (mechanical additive DTO compatibility only)

### Tests and handoff

- `src/app/page.test.tsx`
- `src/components/app/ApplicationShell.test.tsx`
- `src/components/screens/HistoryView.test.tsx`
- `src/components/screens/ExerciseDetailView.test.tsx`
- `src/components/screens/TrainView.test.tsx`
- `src/server/queries/history.test.ts`
- `src/server/queries/workouts.test.ts`
- `SESSION_NOTES.md`
- `.superpowers/sdd/2026-08-08-gym-tracker-backend-implementation/phase-5-task-2-report.md`

## TDD evidence

### RED

Command:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/app/page.test.tsx src/components/app/ApplicationShell.test.tsx src/components/screens/HistoryView.test.tsx src/components/screens/ExerciseDetailView.test.tsx src/components/screens/TrainView.test.tsx
```

Result: 19 behavior tests failed and 13 baseline tests passed across five files. Failures named the missing server hydration, factual ledgers, pagination, duplicate prevention, safe failure/retry states, stale-response containment, nullable previous-performance rendering, missing-position matching, and completion refresh. The new ApplicationShell legacy-boundary suite initially hit a test-only `server-only` import poison; action modules were mocked at their external boundary before validating its intended RED separately.

Isolated legacy-boundary RED command:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/components/app/ApplicationShell.test.tsx
```

Result: 1/1 failed at `ApplicationShell.tsx` because the throwing `getWorkoutHistory` boundary was called (`Legacy workout fixtures were accessed.`).

### GREEN

First focused implementation run: 45/47 passed. The two remaining failures were expectation updates required by the additive `setNumber` DTO field and a rendered-date matcher whose semantic line also contained duration; neither required new production behavior.

Final focused command:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/server/queries/history.test.ts src/server/queries/workouts.test.ts src/app/page.test.tsx src/components/app/ApplicationShell.test.tsx src/components/screens/HistoryView.test.tsx src/components/screens/ExerciseDetailView.test.tsx src/components/screens/TrainView.test.tsx
```

Result: 7 files passed, 47 tests passed, 0 failed.

An intermediate `pnpm typecheck` correctly exposed 28 legacy fixture objects missing the new required `setNumber`; the fixture data was updated mechanically and the final typecheck passed.

## Verification

Runtime:

```text
node v24.18.0
pnpm 11.20.0
```

Focused suite:

```text
7 files passed
47 tests passed
```

Full suite, run once before commit:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test
30 files passed, 3 skipped
217 tests passed, 8 skipped
exit 0
```

Typecheck:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm typecheck
tsc --noEmit
exit 0
```

Lint:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm lint
eslint
exit 0
```

Production build:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm build
Next.js 16.3.0 webpack build compiled successfully
TypeScript completed
6/6 static pages generated
build traces collected
exit 0
```

Diff and boundary checks:

```text
git diff --check
exit 0, no output

rg -n "getWorkoutHistory\\(" src --glob '!**/*.test.*'
no production matches

rg -n "getCompletedWorkoutHistory\\([^)]*userId|getExerciseWorkoutHistory\\([^)]*userId" src --glob '!**/*.test.*'
no production matches
```

No database, hosted-data, migration, seed, schema-check, deployment, or browser account command ran in this task.

## Impeccable detector

The required detector was run exactly once after UI edits:

```text
/tmp/einherjar-node24/node_modules/node/bin/node /home/eyerin/.agents/skills/impeccable/scripts/detect.mjs --json src/components/app/ApplicationShell.tsx src/components/screens/HistoryView.tsx src/components/screens/ExerciseDetailView.tsx src/components/screens/TrainView.tsx src/components/ui/SetEntry.tsx
```

Exact output:

```json
[]
```

There were no detector findings to fix.

## Self-review

- Authentication/ownership: server hydration uses only `session.user.id`; client action inputs contain no owner field.
- Waterfalls: independent reads start together; only first-exercise history waits for the exercise list it requires.
- Serialization: only the existing UI DTOs cross the RSC boundary; database rows and user IDs are not duplicated into history action inputs.
- Pagination correctness: the request ref closes the same-render double-click window, action/transport failures do not mutate page state, retry reuses the retained cursor, and response sessions are deduplicated by stable ID.
- Stale selection correctness: request IDs are checked before both success and failure state updates; old exercise content is hidden as soon as the selector changes.
- Factual/mock separation: the only Historical Session Ledger in Exercise Detail consumes `ExerciseHistory`; later-phase mock PR/chart/AI panels remain visibly separate.
- Nullable values: display and volume calculations distinguish bodyweight from zero load.
- Accessibility/responsiveness: semantic buttons/select/section/status/alert elements, `aria-expanded`/`aria-controls`, visible focus, disabled/loading copy, 44px controls, wrapping, and `min-w-0` are retained or added.
- React keys: completed sessions, exercises, and sets use stable database IDs rather than array indexes.
- Completion: refresh occurs only inside the successful completion callback, after the success state and active-workout reconciliation are scheduled.
- Scope: additive previous-set `setNumber` is the only shared DTO extension and is necessary for the explicit no-shift requirement; no persistence or schema contract changed.

## Concerns

No blocking concern. Browser/hosted verification was deliberately not run because the task prohibited hosted-data access and the requested gate was local tests, detector, typecheck, lint, build, and diff validation. The fixed `en-GB` display language keeps ledger dates concise while `Intl.DateTimeFormat` still resolves the viewer's local time zone; broader locale selection remains outside this phase.

## Fix Round 1 — refreshed non-initial exercise selection

### Reviewer finding

A non-initial exercise could remain selected after `initialExerciseHistory` refreshed to the authoritative first exercise. The history source/value state correctly resolved to the refreshed prop, but the independent raw selection state still named the non-initial exercise. No history then matched the selected label, and the fallback loading state had no request that could settle it.

### RED

Added a rendered-behavior regression that:

1. hydrates the first exercise;
2. selects and successfully settles a second exercise through the authenticated action boundary;
3. rerenders with refreshed authoritative first-exercise history props; and
4. requires the selector and ledger to reconcile to that refreshed exercise with no loading state or stale second-exercise content.

Command:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/components/screens/ExerciseDetailView.test.tsx
```

RED result:

```text
1 file run
1 failed, 6 passed
Expected first exercise ID after refresh; received the still-selected second exercise ID
```

The failure was the reviewed defect, not a setup or syntax error.

### Implementation

- Replaced the raw selected-exercise string state with the same source/value pattern already used by factual history.
- User selection remains local while `initialExerciseHistory` retains its identity.
- When a server refresh supplies a new authoritative first-exercise history prop, the derived selection and factual ledger reset together to that exercise.
- No prop-derived effect or extra history request was added.
- The existing monotonically increasing request-ID checks remain unchanged. A response from a request started before refresh cannot become visible under the reconciled first-exercise selection because its stored source no longer matches the current server prop.
- Renamed the older page test to accurately state that it covers completed-history reconciliation; the new component regression now explicitly owns exercise-history reconciliation coverage.

Files changed:

- `src/components/screens/ExerciseDetailView.tsx`
- `src/components/screens/ExerciseDetailView.test.tsx`
- `src/app/page.test.tsx`
- `SESSION_NOTES.md`
- `.superpowers/sdd/2026-08-08-gym-tracker-backend-implementation/phase-5-task-2-report.md`

### GREEN and verification

Focused GREEN:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/components/screens/ExerciseDetailView.test.tsx
1 file passed, 7 tests passed
```

Covering UI/page tests, including the existing stale-response race:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm test src/app/page.test.tsx src/components/app/ApplicationShell.test.tsx src/components/screens/ExerciseDetailView.test.tsx
3 files passed, 18 tests passed
```

Static gates:

```text
PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm typecheck
tsc --noEmit
exit 0

PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm lint
eslint
exit 0

git diff --check
exit 0, no output
```

The build was not rerun because the fix changes only client-local state derivation and does not touch a server/client boundary, action signature, serialized prop, or build configuration. The Impeccable detector was not rerun because its one permitted invocation was already consumed by the original task.

### Self-review

- The selected exercise and displayed factual history now share one authoritative refresh source, so they cannot drift into a label/content mismatch after refreshed props.
- Normal user selection behavior is unchanged until a server refresh occurs.
- Refresh policy is explicit and deterministic: reconcile to the refreshed initial exercise instead of silently preserving stale non-initial content.
- No action input, authentication, ownership, pagination, date formatting, styling, or later-phase mock boundary changed.
- Existing slow-response ordering coverage remains green, and pre-refresh action responses remain unable to overwrite the refreshed visible exercise.

### Concerns

No blocking concern. The timezone-dependent date-test observation remains a deferred Minor exactly as requested and was not changed in this fix round.
