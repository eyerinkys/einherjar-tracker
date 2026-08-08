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
