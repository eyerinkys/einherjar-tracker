# Phase 1 Session Notes

## Scope and worktree

- Active implementation worktree: `.worktrees/phase-1-neon-drizzle`
- Branch: `phase-1-neon-drizzle`
- Phase 1C and its review remediation are committed through `7cce59c`; the
  reviewed build-toolchain fix is committed through `b90b8db`. Production
  verification fixes are the current uncommitted boundary.
- Do not modify or stage the unrelated documentation changes in the main checkout.

## Completed implementation

- Phase 1A is committed:
  - `34b62b8 chore: adopt pnpm and add backend dependencies`
  - `a32c0f3 chore: add validated database environment contract`
- Added the generated Better Auth 1.6.26 Drizzle schema.
- Added Drizzle/Neon client and configuration, core workout schema, migration smoke check, schema-integrity check, and test coverage.
- Regenerated the initial migration from the final schema after review:
  - `drizzle/0000_windy_beyonder.sql` — Better Auth and core workout
    tables, completed-session lifecycle validation, finite non-negative exact
    `numeric` workout loads, foreign keys, and indexes. The redundant direct
    `workout_sets.session_exercise_id` index was omitted because its leading
    column is already covered by the unique set-position index.
- Strengthened the direct schema check to inspect all required indexes and
  constraints, exact `numeric` weight storage, and `ON DELETE SET NULL` split
  history behavior. Failed checks now log only a fixed safe message.
- Review round 2 makes those live checks structural: catalog definitions must
  match the active-workout partial unique index, FK/history index columns and
  ordering, and every critical FK/check condition after PostgreSQL definition
  normalization.
- Review round 3 replaces permissive constraint regexes with exact normalized
  canonical definitions. Only an implicit or explicit default `NO ACTION` is
  accepted where PostgreSQL can omit that clause; appended weakening terms and
  any other delete action fail the live check.

## Neon state

- Production branch `br-dawn-mountain-azrfoy6x` was identified through Neon SQL
  metadata, confirmed blank, and migrated with `0000_windy_beyonder.sql`.
- Disposable branches created for Phase 1 verification:
  - `br-autumn-silence-az3ob0kj` (`phase-1-schema`)
  - `br-twilight-waterfall-az8c5fyl` (`phase-1-empty-migration-verify`)
- Both branches expire on 2026-08-22.
- The exact final migration was applied to blank production and rerun safely;
  Drizzle reported success both times without duplicating schema objects.
- `.env.local` now points to the correctly paired production pooled/direct
  endpoints. The file remains ignored and no credential is committed.
- The previous non-production target already had ten Phase 1 tables and an old
  two-entry migration ledger; it was identified and left unchanged.

## Fresh verification evidence

- `pnpm test` — 6 files, 22 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm exec drizzle-kit check` — passed.
- `pnpm db:generate` — generated `0000_windy_beyonder.sql`, then reported no
  pending schema changes on a fresh rerun.
- `pnpm db:migrate` — applied the exact final migration to blank production;
  a second run completed safely.
- `pnpm db:check` — production pooled/direct connectivity and interactive
  transactions passed; the live schema-integrity check passed.
- Production verification exposed and fixed the catalog query's incorrect
  `constraint_name` column and added exact PostgreSQL-generated constraint
  formatting fixtures for trim, lifecycle, completed-set, and numeric checks.
- `git diff --check` — passed.

## Build toolchain

- Installed checksum-verified Node v24.18.0 locally. `.node-version` selects
  that release, while the strict package engine contract permits only Node 24.
- Next 16.3's experimental TypeScript CLI wrapper returned empty captured
  `--showConfig` output even though `tsc` succeeded. `next.config.ts` now uses
  the stable TypeScript compiler API path supported by TypeScript 5.9.
- The managed host blocks Turbopack's internal port, so the production build
  script explicitly uses webpack. The unchanged application then completed
  compilation, TypeScript, static generation, and build traces under Node 24.

## Next step

1. Rotate the `neondb_owner` password in Neon because it was pasted into chat,
   then replace both ignored `.env.local` URLs with the rotated pooled/direct
   values.
2. Protect production branch `br-dawn-mountain-azrfoy6x` in the Neon console.
3. Commit and review the production-verification fix, then continue with Phase 2.
