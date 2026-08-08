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
- `pnpm db:check` — passed against the configured disposable verification
  database: pooled query/transaction, direct query/transaction, and schema
  integrity all passed. It did not log connection values.
- `pnpm build` — blocked before application compilation because Turbopack
  cannot bind an internal worker port (`Operation not permitted`).
- `pnpm exec next build --webpack` — passed without repository changes:
  compilation, TypeScript, static-page generation, and build traces completed.

## Files changed

- `drizzle.config.ts`
- `drizzle/0000_cynical_thunderbolt_ross.sql`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `src/auth.ts`
- `src/db/client.ts`
- `src/db/check.ts`
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

- The current configured disposable branch has the previously verified,
  functionally equivalent two-file migration ledger. Since this task
  regenerated a single final initial migration (including the `numeric` fix),
  it was not reapplied to that already-migrated branch; doing so would conflict
  with the recorded old migration tags. Apply it from zero only to a fresh
  disposable database before any shared/production use.
- The default `pnpm build` remains unavailable on this host because of the
  Turbopack worker-port restriction. Webpack mode proves the application build
  succeeds unchanged, but it does not turn the default build into a pass.
