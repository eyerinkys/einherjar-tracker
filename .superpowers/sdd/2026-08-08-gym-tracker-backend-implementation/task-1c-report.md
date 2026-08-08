# Task 1C — Initial migration and database verification report

## Scope implemented and inspected

- Preserved the Phase 1A/1B commits and completed only the uncommitted Phase
  1C schema, generated migration, database check, tests, README, and session
  handoff in the `phase-1-neon-drizzle` worktree.
- Retained Drizzle's Neon WebSocket runtime client and direct URL Drizzle Kit
  configuration. No `drizzle-kit push` command or configuration was added.
- Kept the Better Auth 1.6.26-generated `user`, `session`, `account`, and
  `verification` schema as the canonical authentication tables.
- Regenerated one initial SQL migration and metadata from the final schema.
  It creates all four Better Auth tables and the six required workout tables;
  includes all foreign keys and common ownership/history indexes; and contains
  no `DROP` or destructive statements.
- Verified by SQL inspection that `workout_sessions.source_split_day_id` uses
  `ON DELETE SET NULL`, snapshot columns remain non-nullable, and the partial
  unique index permits at most one `in_progress` session per user.
- Confirmed non-empty name, positive target, rep-range, non-negative weight,
  finite-weight, positive completed-rep, version, and lifecycle checks in the
  generated SQL. Workout weights now use PostgreSQL `numeric`, not floating
  point, so later DTO boundaries can choose their numeric representation.
- Retained the `db:check` smoke path: it performs query and interactive
  transaction checks through both pooled `DATABASE_URL` and direct
  `DIRECT_DATABASE_URL`, then checks required tables and critical indexes.
- README documents generated-migration review, `drizzle-kit migrate`, rerun
  safety, and the prohibition on `drizzle-kit push` for shared/production use.

## TDD evidence

The audit found that the pre-existing schema used `double precision` for
`workout_sets.weight`, contrary to the exact-`numeric` requirement.

1. Added `stores workout loads as exact PostgreSQL numerics` to
   `src/db/schema/index.test.ts`.
2. Red: `pnpm test src/db/schema/index.test.ts` failed only that test:
   expected `PgNumeric`, received `PgDoublePrecision`.
3. Green: changed the column to Drizzle `numeric('weight')`, retained the
   finite/non-negative SQL checks for the numeric type, and reran the same
   test. It passed: 4/4 tests.
4. Regenerated the initial migration and Drizzle metadata from the final
   schema. A subsequent `pnpm db:generate` reported no pending schema changes.

## Verification and outputs

- `pnpm test` — passed: 5 test files, 10 tests.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm exec drizzle-kit check` — passed (`Everything's fine`).
- `pnpm db:generate` — passed; fresh rerun reported no schema changes.
- The previous `pnpm db:check` result exercised pooled/direct transactions,
  but cannot serve as final evidence: remediation inspection could not verify
  that the configured endpoint is disposable, and it predates the exact final
  migration plus strengthened integrity assertion.
- `pnpm build` — blocked before application compilation because Turbopack
  cannot bind an internal worker port (`Operation not permitted`).
- `pnpm exec next build --webpack` — passed without repository changes:
  compilation, TypeScript, static-page generation, and build traces completed.

## Files changed

- `drizzle.config.ts`
- `drizzle/0000_windy_beyonder.sql`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `src/auth.ts`
- `src/db/client.ts`
- `src/db/check.ts`
- `src/db/error-redaction.ts`
- `src/db/error-redaction.test.ts`
- `src/db/client.test.ts`
- `src/db/schema/{auth,core,index}.ts`
- `src/db/schema/{index,schema-integrity}.test.ts`
- `src/db/schema-integrity.ts`
- `README.md`
- `SESSION_NOTES.md`

## Self-review

- Every foreign key has an index directly or as the leading column of a
  compound ownership/history index.
- Workouts preserve `split_day_name` and session-exercise snapshot fields;
  deleting the source split only nulls the nullable source ID.
- `workout_sets.weight` is exact `numeric`; there is no frontend numeric
  conversion in this Phase 1 boundary.
- Database URLs remain server-only; error output reports only error messages,
  never connection strings.
- No UI, RLS, APIs, custom exercise tooling, nutrition, timers, offline sync,
  or other later-phase scope was added.

## Remaining concerns

- The original current endpoint was described as disposable, but the review
  remediation inspection found that both configured endpoint hostnames match
  neither documented disposable branch nor the documented production branch.
  No migration or reset was attempted against that unverified target.
- The exact regenerated migration was not applied to a fresh disposable
  database because this worktree has no Neon branch-provisioning credential or
  CLI, and therefore cannot safely create or reset a fresh target. The required
  blank-database/rerun gate is **BLOCKED** pending verified disposable pooled
  and direct URLs. It must not be inferred from the earlier two-file ledger.
- The default `pnpm build` remains unavailable on this host because of the
  Turbopack worker-port restriction. Webpack mode proves the application build
  succeeds unchanged, but it does not turn the default build into a pass.

## Review remediation — round 1

### Findings fixed in code

- `src/db/check.ts` no longer forwards arbitrary driver error messages. It now
  logs the fixed `Database check failed. Connection details were redacted.`
  message through `getSafeDatabaseCheckFailureMessage()`.
- The live integrity path now queries public column types and PostgreSQL
  constraint definitions in addition to table and index names. It verifies all
  Phase 1 foreign-key/history indexes, all schema checks and foreign keys,
  `workout_sets.weight` as `numeric`, and the source-split foreign key's
  `ON DELETE SET NULL` behavior.
- Removed the redundant `workout_sets_session_exercise_idx`: the unique
  `(session_exercise_id, set_number)` index retains the required FK leading
  column. The fresh generated migration is
  `drizzle/0000_windy_beyonder.sql`; SQL inspection found no `DROP` statement
  and no redundant index.
- Refreshed `SESSION_NOTES.md` to record `6c125f0` and the remediation state.

### Review TDD evidence

1. **Red — schema/index/integrity:**
   `pnpm test src/db/schema/index.test.ts src/db/schema-integrity.test.ts`
   failed as expected: three live-contract tests did not throw and the
   redundant-index assertion received `true`.
2. **Red — URL error handling:**
   `pnpm test src/db/error-redaction.test.ts` failed because the new helper
   module did not exist. The test passed a synthetic
   `postgresql://other:leaked-password@...` driver error and asserts the
   password cannot appear in output.
3. **Green — focused:** after adding the fixed safe error message, catalog
   metadata assertions, and index removal,
   `pnpm test src/db/error-redaction.test.ts src/db/schema/index.test.ts src/db/schema-integrity.test.ts`
   passed: 3 files, 11 tests.
4. **Green — full:** `pnpm test` passed: 6 files, 15 tests; `pnpm typecheck`,
   `pnpm lint`, and `pnpm exec drizzle-kit check` also passed.
5. **Generated SQL:** `pnpm db:generate` created
   `0000_windy_beyonder.sql`; a rerun reported no schema changes. Inspection
   confirmed `weight numeric`, the partial active-workout index, and source
   split `ON DELETE SET NULL`; searches returned no `DROP` or redundant index.

### Fresh migration verification — blocked safely

- Inspected `.env.local` without printing URLs. Node checks failed with
  `Configured endpoints do not match the documented disposable branch.` and
  then `Configured endpoints do not match a documented disposable branch.`
  The endpoints also did not match the documented production branch.
- `printenv | cut -d= -f1 | rg '^(NEON|DATABASE|DIRECT_DATABASE|POSTGRES|PG|API)'`
  found no branch-provisioning/API environment variable, and the only relevant
  local executable was `drizzle-kit`; no Neon branch CLI is installed.
- Therefore no `pnpm db:migrate`, database reset, or `pnpm db:check` was run
  against the unverified endpoint. Supply fresh disposable pooled/direct URLs,
  inspect that target, then apply this exact migration twice and run the
  pooled/direct check before clearing this blocker.

## Review remediation — round 2

### Structural live schema contract

- `src/db/check.ts` now fetches `pg_indexes.indexdef`, not only index names,
  and passes each definition to `assertSchemaIntegrity`.
- The integrity assertion normalizes catalog definitions (case, quoting,
  public schema qualification, PostgreSQL enum casts, comma spacing, and
  whitespace) before validation.
- It requires exact normalized definitions for every Phase 1 ownership/history
  index. In particular, the active-workout index must be unique, use exactly
  `(user_id)`, and have exactly the `status = 'in_progress'` partial predicate;
  the unique workout-set index must preserve
  `(session_exercise_id, set_number)` order.
- It now validates the definition of every required foreign key and check
  constraint, not only its name. This verifies FK columns/references/delete
  behavior and non-empty, positive, range, lifecycle, non-negative numeric,
  finite numeric, and completed-rep constraints. The source split reference
  remains required to use `ON DELETE SET NULL`.

### Round 2 TDD evidence

1. **Red:** `pnpm test src/db/schema-integrity.test.ts` ran 9 tests and failed
   four expected regressions. Same-named non-unique/non-partial active-workout
   and reversed set indexes, a weakened `target_sets >= 0` check, and a
   `CASCADE` source-split FK all passed the prior implementation.
2. **Green focused:** after adding normalized index and constraint definition
   matching, `pnpm test src/db/schema-integrity.test.ts` passed 9/9 tests.
3. **Green full:** `pnpm test` passed 6 files and 19 tests; `pnpm typecheck`,
   `pnpm lint`, and `pnpm exec drizzle-kit check` passed. `pnpm db:generate`
   reported no schema changes, and the unchanged
   `pnpm exec next build --webpack` completed compilation, TypeScript, static
   generation, and build traces.
4. The initial full verification exposed one compile-only fixture omission
   (`indexDefinitions` absent from the empty-metadata test). Adding the new
   required empty field restored `pnpm typecheck`; the final full gate above is
   the passing evidence.
5. **Catalog-format TDD:** a final fixture omitting PostgreSQL's default
   `ON DELETE NO ACTION` clause failed as expected (10-test focused suite,
   one failure). The FK matcher now accepts that canonical implicit default
   while still requiring every explicit cascade/set-null behavior; focused
   verification passed 10/10, with typecheck and lint also passing.

### Fresh migration gate

The fresh disposable migration/rerun gate remains **BLOCKED** exactly as
documented in the prior round. No unverified endpoint, production endpoint,
or database command was used in this round.

## Review remediation — round 3

### Exact normalized constraint definitions

- Replaced every unanchored critical-FK/check regex with an exact normalized
  catalog definition (or a strict two-value alternative for PostgreSQL's
  implicit versus explicit default `ON DELETE NO ACTION`).
- Normalization now additionally converts PostgreSQL's `btrim` rendering back
  to canonical `trim` and removes only full wrapping check parentheses. It
  preserves the complete check expression, so appended disjuncts cannot match.
- The default split-exercise/exercise FK accepts only:
  `FOREIGN KEY (exercise_id) REFERENCES exercises(id)` or that exact definition
  with `ON DELETE NO ACTION`; explicit `CASCADE`, `SET NULL`, or any suffix is
  rejected. All other FK delete actions and every check expression are exact.

### Round 3 TDD evidence

1. **Red:** `pnpm test src/db/schema-integrity.test.ts` ran 12 tests and
   failed the two new regressions: an explicit `ON DELETE CASCADE` on the
   default-NO-ACTION FK and `target_sets > 0 OR target_sets IS NULL` both
   passed the prior unanchored matchers.
2. **Green focused:** replacing the patterns with exact normalized canonical
   definitions made the focused suite pass 12/12.
3. **Green full:** `pnpm test` passed 6 files and 22 tests; `pnpm typecheck`,
   `pnpm lint`, `pnpm exec drizzle-kit check`, and `pnpm db:generate` (no
   schema changes) passed.

### Fresh migration gate

The fresh disposable migration/rerun gate remains **BLOCKED**. No unverified
or production endpoint was touched in this remediation round.
