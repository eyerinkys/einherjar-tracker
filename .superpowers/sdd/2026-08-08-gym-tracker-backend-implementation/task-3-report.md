# Task 3 Report — Phase 3C Split UI persistence

## Status

`DONE_WITH_CONCERNS`

The deterministic implementation and verification work is complete. The required live desktop/mobile browser mutation pass remains outstanding because this checkout exposes only the configured database credentials, no disposable application/test database URL, and no callable browser automation tool. Production was not used for mutation testing.

## Implemented scope

- The protected server root authenticates first, then starts `getExercises(userId)` and `getSplitDays(userId)` together with `Promise.all`.
- Only the serializable exercise and split DTOs needed by the client shell cross the server/client boundary.
- `ApplicationShell` initializes Split state from the persistent DTO and continues passing the same current state to both Split and Train. Existing mock-backed workout history and other phase-owned datasets remain unchanged.
- The production Split and Progress paths no longer call the mock `getExercises()` or `getSplitDays()` service functions; Progress receives the same persisted exercise DTOs from the server root.
- Connected all eight existing authenticated Server Actions:
  - create, rename, delete, and reorder split days;
  - add, remove, reorder, and update split exercises, including targets and optional notes.
- Every successful mutation replaces the rendered split with the authoritative action result. Unedited exercise drafts also reconcile to authoritative values; an explicit unsaved draft remains local until it is saved or its exercise disappears.
- Failures keep the persisted view and relevant draft/confirmation state intact. A retry control repeats retryable failed operations, including thrown request failures; `NOT_FOUND` and `STALE_ORDER` instead expose a refresh recovery path so a permanently stale destructive payload is not replayed.
- A synchronous ref guard plus disabled pending controls prevents duplicate submissions before React can repaint.
- Day and application navigation are disabled while a mutation is pending so in-flight drafts, confirmations, and eventual failures cannot be lost by unmounting or retargeting the Split screen.
- Added client validation for day names, sets, rep bounds/ranges, and notes length.
- Added inline day/exercise removal confirmations while retaining the existing confirmation treatment.
- Added an explicit notes editor and save control using the incumbent charcoal/bone/moss styling and layout primitives.
- Added polite success status, live inline errors, `aria-busy`, semantic labels, native form controls, 44px targets, tab semantics with arrow/Home/End keyboard navigation, add-dialog focus entry/trapping while idle or pending, Escape close, and logical focus recovery after successful create/add/remove/delete operations.
- Hardened rename, exercise-header, and confirmation layouts to stack or wrap within narrow mobile panels.
- Preserved the current Norse visual system, responsive tabbed shell, and downstream mock-backed Train/history behavior.

## Strict TDD evidence

All product behavior was exercised through the rendered components with React Testing Library and `user-event`; action modules were mocked only at the server boundary.

### RED

- Initial persistent hydration failed because the rendered Split screen did not contain the queried `Persistent Push` DTO; the first test-harness run also exposed the missing `@` Vitest alias, which was corrected before using the product failure as RED.
- Create-day coverage first failed because no `Create day` operation existed; failure/retry, pending duplicate prevention, and blank-name validation then each failed before their corresponding states were implemented.
- Rename coverage failed on the missing labeled rename control. Delete and both reorder flows failed on their missing accessible operation controls.
- Add-exercise coverage failed on the unlabeled combobox; add validation failed before inline rep-range feedback was added.
- Remove-exercise and exercise-reorder coverage failed on the missing named controls/confirmation behavior.
- Exercise target/notes persistence failed with `Unable to find role="spinbutton" and name "Bench Press target sets"` before the draft and explicit save UI existed.
- Accessibility batch: `3 failed | 20 passed` because ArrowRight did not select/focus the next tab, the dialog did not receive/restore focus, and no success status existed.
- Authoritative draft reconciliation failed with `Expected: "6" / Received: "4"` after a reorder response changed an unedited target.
- Empty-split selection and invalid-rename batch failed `2 failed | 24 skipped`: the returned first tab had `aria-selected="false"`, and blank rename lacked `aria-invalid`/feedback.
- Focus-trap coverage failed because Shift+Tab from the dialog's first control reached the background `Save Cable Row targets` button.
- Add-action failure coverage failed because the only alert was obscured behind the still-open dialog; the server error and retry control were then rendered inside the dialog.
- Pending-dialog coverage failed because disabling every child left no tabbable element and focus could escape; the dialog now remains the containment target during the request.
- Conflict recovery first exposed a stale reorder `Retry`; `NOT_FOUND`/`STALE_ORDER` now provide authoritative refresh recovery instead.
- Success-focus regressions failed for create, first add, remove, rename, and day delete because focused controls unmounted to `body`; each operation now selects a logical surviving focus target.
- Refresh reconciliation initially left a removed day's confirmation able to retarget the new selected day and retained an old clean exercise draft. Target-bound state is now keyed and clean drafts derive from refreshed authoritative props.
- Persisted Progress-library coverage failed while `ExerciseDetailView` still called the mock service; it now receives the server-loaded exercise DTOs.
- Persisted Progress behavior then failed because the built-in UUIDs did not match the still-phase-owned `ex-*` progression/AI/PR keys. A nine-built-in compatibility map now preserves those mock datasets without restoring the mock exercise library as the selector source.
- The first refreshed-prop reconciliation implementation failed lint with `react-hooks/set-state-in-effect`; source-keyed derived state removed the synchronous effects and then passed lint.
- Pending-interaction coverage failed because create/day tabs/outer navigation remained editable during deferred actions. Those controls now stay disabled until the operation settles, preserving the captured draft and failure recovery UI.
- A deferred rename self-review test exposed that the empty-state `Add First Exercise` path alone remained enabled during mutations; the shared empty-state action now accepts and honors the pending disabled state.

### GREEN

- Incremental operation cycles reached 18 passing Split tests after target/notes save, then 20 after update failure/validation coverage.
- Accessibility/status implementation reached 23 passing Split tests.
- Authoritative draft reconciliation reached 24 passing Split tests.
- Empty-split selection and rename validation reached 26 passing Split tests.
- Focus trapping reached 27 passing Split tests.
- Review-driven behavior cycles covered modal-scoped action errors, stale-conflict refresh, pending focus containment, keyboard confirmation cancellation, successful mutation focus recovery, refreshed-prop reconciliation, persisted Progress exercises, narrow-layout contracts, and pending navigation containment.
- Final focused command:

  `PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm exec vitest run src/app/page.test.tsx src/components/screens/SplitView.test.tsx`

  Result: `2 passed` files, `40 passed` tests.

The final suite covers initial DTO hydration, parallel query start, persisted exercise handoff to Progress, current-state handoff to Train, success and failure reconciliation for each of the eight operations, validation, pending/duplicate prevention and navigation containment, delete/remove confirmation, authoritative prop/draft refresh, retry versus stale-conflict recovery, keyboard tabs, dialog focus containment/restoration, successful-operation focus recovery, responsive layout contracts, and live success feedback.

## Files changed

- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/components/app/ApplicationShell.tsx`
- `src/components/layout/Navigation.tsx`
- `src/components/screens/ExerciseDetailView.tsx`
- `src/components/screens/SplitView.tsx`
- `src/components/screens/SplitView.test.tsx`
- `src/components/ui/EmptyState.tsx`
- `vitest.config.mts`
- `package.json`
- `pnpm-lock.yaml`
- `SESSION_NOTES.md`
- this report

Minimal test-only dependencies added: `@testing-library/react@16.3.2`, `@testing-library/user-event@14.6.1`, and `jsdom@26.1.0`. The pnpm lockfile was updated.

## Deterministic verification

Runtime: Node `v24.18.0`, pnpm `11.20.0`.

- Focused Phase 3C tests: 2 files and 40 tests passed.
- Full `pnpm test`: 19 files passed, 2 opt-in PostgreSQL files skipped; 134 tests passed and 7 skipped.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed with the configured Next.js 16.3 webpack build and TypeScript validation.
- `git diff --check`: passed.
- Impeccable detector, run once at the required UI integration checkpoint:

  `node /home/eyerin/.agents/skills/impeccable/scripts/detect.mjs --json src/app/page.tsx src/components/app/ApplicationShell.tsx src/components/screens/SplitView.tsx src/components/ui/EmptyState.tsx`

  Exact output: `[]`.

  Later review-driven UI changes were narrowly scoped behavior, focus, and responsive corrections validated through component tests, lint, typecheck, and build. The detector was not invoked a second time because the task explicitly limited it to one run.

- No schema migration, database push, seed, deployment, or production data mutation was run.
- The controller-owned unstaged `RULES.md` advisory edit was preserved and excluded from Task 3 staging.
- The independent final bounded review confirmed the persisted Progress compatibility and pending empty-state fixes, with no remaining Critical or Important findings.

## Browser/disposable verification remainder

No live browser pass or screenshots are claimed.

Environment inspection exposed `DATABASE_URL` and `DIRECT_DATABASE_URL` in the configured `.env`/`.env.local`, but no `SPLIT_TEST_DATABASE_URL`, other disposable full-application database URL, Playwright setup, or callable Chrome/Playwright browser tool. The normal integration suites also remained safely opt-in. Using the configured database for the requested mutation walkthrough would have violated the task constraint.

To close this remainder, a future verifier must:

1. Provide a disposable, non-production full application database target and disposable auth credentials, with the required schema/exercise catalog available.
2. Run the production build or dev server exclusively with that disposable target.
3. At desktop and mobile widths, exercise create/rename/delete/reorder day and add/remove/reorder/update exercise paths, then refresh and verify persistence.
4. Verify keyboard/focus behavior, visible focus, dialog containment/restoration, 44px targets, console health, request health, and one forced failed-request/retry flow.
5. Record the disposable target identity and browser evidence separately from production deployment evidence.

## Concerns

- The implementation is deterministic-test, typecheck, lint, and build clean, and the single required detector invocation returned no findings. Completion remains `DONE_WITH_CONCERNS` until the safe live browser/disposable-database matrix above is performed.
- No production deployment or production runtime behavior is asserted by this task.

## Fix Round 1 — truthful refresh status and cancellation focus

### Findings resolved

- Conflict refresh recovery now stores the split-prop source that initiated the refresh. While that source is current, the live region says `Refreshing split…`; when refreshed authoritative props arrive with a new source, the rendered status derives `Split refreshed.` without a synchronous prop-to-state effect.
- Cancelling inline rename, day deletion, or exercise removal now schedules focus restoration through the existing post-render focus mechanism. Focus returns respectively to `Rename Day`, the selected day's delete button, or the matching exercise remove button after the cancellation UI unmounts.

### TDD evidence

Rendered behavior tests were added first in `src/components/screens/SplitView.test.tsx`:

- `returns focus to Rename Day when inline rename is cancelled`
- `returns focus to the day delete button when deletion is cancelled`
- `announces completion when refreshed props reconcile a stale conflict`
- `returns focus to the exercise remove button when removal is cancelled`

RED command:

`PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm exec vitest run src/components/screens/SplitView.test.tsx -t "returns focus|announces completion when refreshed props"`

RED result: `1 failed` file; `4 failed | 34 skipped` tests. The refresh case still rendered `Refreshing split…` after rerendering new authoritative props. The three cancellation cases focused another control or `body` instead of the originating action.

GREEN command:

`PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm exec vitest run src/components/screens/SplitView.test.tsx -t "returns focus|announces completion when refreshed props"`

GREEN result: `1 passed` file; `4 passed | 34 skipped` tests.

### Verification

- Covering component suite: `PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm exec vitest run src/components/screens/SplitView.test.tsx` — `1 passed` file, `38 passed` tests.
- `PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm typecheck` — passed.
- `PATH=/tmp/einherjar-node24/node_modules/node/bin:$PATH pnpm lint` — passed.
- `git diff --check` — passed.
- Files changed in this fix: `src/components/screens/SplitView.tsx`, `src/components/screens/SplitView.test.tsx`, and this report.
- `RULES.md` remains controller-owned and unstaged. No database, deployment, or browser operation was run. The disposable-database desktop/mobile browser gate remains outstanding and is not claimed here.
