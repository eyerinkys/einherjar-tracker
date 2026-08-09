# Phase 5 Task 1 Report — History and previous-performance server contracts

## Status

DONE

The completed-workout history, completed-session detail, per-exercise history, previous-performance selection, authenticated read actions, validation, and DTO boundaries are implemented. No schema, migration, frontend, hosted-data, or deployment change was made.

## What changed

- Added server-only Drizzle history reads for owner-scoped completed sessions, completed child sets, completed-session detail, visible-exercise history, and previous performance.
- Added stable cursor pagination ordered by `(completed_at DESC, id DESC)`, with a default page size of 20, a hard cap of 50, a bounded opaque cursor carrying both ordering fields, and `pageSize + 1` lookahead for `nextCursor`.
- Added explicit serializable history DTOs. Stored UTC timestamps become ISO strings, duration is derived from stored start/completion timestamps, PostgreSQL `numeric` values become frontend numbers only at DTO mapping, nullable deleted source IDs remain null, and snapshot names/targets/notes are retained.
- Added deterministic session-exercise and set ordering. Only completed sessions and completed sets enter completed history.
- Added enumeration-safe session detail and exercise visibility. Missing and foreign resources both become `NOT_FOUND`.
- Added chronological per-exercise history over shared built-ins and the authenticated user's visible custom exercise boundary; a visible exercise with no completed history returns an empty session list.
- Added one canonical previous-performance selector. It requires the trusted owner, completed sessions/sets, a strict `completed_at < active.started_at` cutoff, a different session ID, and a requested matching exercise. Stable completion/session/session-exercise/set tie-breakers select and order the latest matching exercise performance.
- Updated active-workout hydration and start-workout draft prefill to use that same selector. Start/save mutation results that reload the active workout therefore expose the same `previousPerformance` facts.
- Preserved exact database numeric text for transaction-side draft prefill and converts it to `number` only for the active-workout/frontend DTO.
- Added three authenticated Server Actions with strict Zod input schemas and the existing `ActionResult<T>` contract. No client action accepts `userId`.

## Files

- `src/server/queries/history.ts` — query predicates, Drizzle adapter, DTO mapping, history pagination/detail/exercise reads, and shared previous-performance selection.
- `src/server/queries/history.test.ts` — mapper, ordering, pagination, ownership SQL, enumeration, exercise history, exclusions, cutoff, and numeric-boundary coverage.
- `src/server/validation/history.ts` — bounded cursor codec and strict page/session/exercise schemas.
- `src/server/validation/history.test.ts` — page default/cap, cursor round trip/malformed rejection, ID validation, and ownership-field rejection.
- `src/actions/history.ts` — authenticated client-callable read boundary and safe `ActionResult<T>` error mapping.
- `src/actions/history.test.ts` — trusted identity, parsed input, safe validation/authorization/internal-error coverage.
- `src/types/history.ts`, `src/types/index.ts` — serializable completed-history and exercise-history DTO contracts.
- `src/server/queries/workouts.ts`, `src/server/queries/workouts.test.ts` — active-workout previous-performance hydration.
- `src/server/workouts/mutations.ts` — start-workout prefill now consumes the shared raw previous-performance selection without numeric round-trip loss.

## TDD evidence

All commands used Node v24.18.0 by prepending `/tmp/einherjar-node24/node_modules/node/bin` to `PATH`; pnpm reported 11.20.0 from the repository package-manager contract.

### Baseline

- `pnpm test`
  - PASS before edits: 24 files passed, 3 skipped; 171 tests passed, 8 skipped.

### RED

1. `pnpm test src/server/validation/history.test.ts`
   - Expected failure: one failed suite because `src/server/validation/history.ts` did not exist.
2. `pnpm test src/server/queries/history.test.ts`
   - Expected failure: one failed suite because `src/server/queries/history.ts` did not exist.
3. `pnpm test src/server/queries/history.test.ts`
   - Expected failures after the first history GREEN: 2 tests failed because `getPreviousPerformanceByExercise` and `previousPerformanceWhere` did not yet exist.
4. `pnpm test src/server/queries/workouts.test.ts`
   - Expected failure: 1 of 3 tests failed; mapper returned `previousPerformance: []` instead of the selected prior sets.
5. `pnpm test src/actions/history.test.ts`
   - Expected failure: one failed suite because `src/actions/history.ts` did not exist.
6. `pnpm test src/server/queries/history.test.ts`
   - Expected failure: 1 of 9 tests failed because the completed-child and exercise-history SQL predicate helpers did not yet exist.
7. Post-commit self-review regression: `pnpm test src/server/queries/history.test.ts`
   - Expected failure: 1 of 10 tests failed because `getPreviousPerformanceRowsByExercise` did not yet exist. The regression represents exact numeric text (`82.500000000000000001`) crossing into transaction-side prefill without a `Number -> String` round trip.

One intermediate SQL assertion initially expected raw `Date` parameters; Drizzle correctly encoded timestamptz parameters as ISO strings. The test expectation was corrected before the corresponding GREEN claim.

### GREEN and focused regression runs

- `pnpm test src/server/validation/history.test.ts` — 1 file, 8 tests passed.
- `pnpm test src/server/queries/history.test.ts` — initial mapper/history GREEN: 1 file, 6 tests passed.
- `pnpm test src/server/queries/history.test.ts` — previous-performance GREEN: 1 file, 8 tests passed.
- `pnpm test src/server/queries/workouts.test.ts src/server/queries/history.test.ts` — 2 files, 11 tests passed.
- `pnpm test src/actions/history.test.ts` — 1 file, 7 tests passed.
- `pnpm test src/server/queries/history.test.ts` — strengthened ownership predicate GREEN: 1 file, 9 tests passed.
- `pnpm test src/server/validation/history.test.ts src/server/queries/history.test.ts src/server/queries/workouts.test.ts src/server/workouts/mutations.test.ts src/actions/history.test.ts src/actions/workouts.test.ts` — 6 files, 37 tests passed.
- `pnpm test src/server/queries/history.test.ts src/server/queries/workouts.test.ts src/server/workouts/mutations.test.ts src/actions/history.test.ts src/server/validation/history.test.ts` — 5 files, 30 tests passed after ordering refactor.
- `pnpm test src/server/queries/history.test.ts src/server/queries/workouts.test.ts src/server/workouts/mutations.test.ts` — 3 files, 16 tests passed after the exact-numeric regression fix.

## Final verification

- `pnpm test` — PASS: 27 files passed, 3 opt-in PostgreSQL files skipped; 197 tests passed, 8 skipped, 0 failed.
- `pnpm typecheck` — PASS (`tsc --noEmit`, exit 0).
- `pnpm lint` — PASS (`eslint`, exit 0, no warnings).
- `git diff --check` — PASS (exit 0).

An intermediate typecheck exposed that the initial adapter parameter accepted only the root Drizzle database, not a transaction. The adapter was narrowed to the root-or-transaction query executor used by its read-only methods, after which typecheck passed. An intermediate lint run found one unused destructuring binding; the mapper structure was simplified and the final lint run is warning-free.

No opt-in PostgreSQL test was added or run. The new behavior is covered by deterministic read adapters, pure mapping/selection tests, and generated Drizzle SQL predicate assertions; normal tests did not connect to the hosted database. No query-plan measurement indicated a schema/index change was needed.

## Post-commit self-review

Reviewed implementation commit `0dc10f2` against the Task 1 brief after committing it.

Finding:

- Important — previous performance was converted from PostgreSQL numeric text to a frontend number and then converted back to text during start-workout draft prefill. This could lose precision. A focused RED reproduced the boundary with `82.500000000000000001`; the selector now exposes one raw selected-row path for transaction storage and a DTO mapping path for frontend numbers. Both paths share the same canonical eligibility and ordering logic.

Re-review after the fix found no remaining Critical or Important issue. In particular:

- All completed-session parent and child SQL predicates include trusted owner and completed status; child queries cannot be launched from unrestricted client IDs.
- Cursor comparison and ordering use both completion timestamp and UUID in the same direction.
- Missing/foreign session and custom-exercise reads remain indistinguishable.
- Active reads and start/save hydration use the same previous-performance selector; the old divergent mutation query was removed.
- No client-callable schema accepts ownership, no internal database error is returned, and timestamps remain ISO UTC strings.
- Existing indexes are used as planned; no migration is warranted by this bounded implementation.

## Concerns

None blocking.

- The normal suite intentionally skips the existing opt-in PostgreSQL files, and this task did not access hosted data. Drizzle SQL construction is covered deterministically; a live read-only integration can be added later only if actual PostgreSQL behavior exposes a gap.
- This task establishes server contracts only. Connecting `HistoryView` and `ExerciseDetailView` to these actions remains the subsequent Phase 5 UI integration task.
