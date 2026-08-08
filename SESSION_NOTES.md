# Phase 1 Session Notes

## Scope and worktree

- Active implementation worktree: `.worktrees/phase-1-neon-drizzle`
- Branch: `phase-1-neon-drizzle`
- Phase 1C and its review remediation are committed through `7cce59c`; the
  build-toolchain fix is the current uncommitted boundary.
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

- Production branch `br-dawn-mountain-azrfoy6x` was not migrated or otherwise changed.
- Disposable branches created for Phase 1 verification:
  - `br-autumn-silence-az3ob0kj` (`phase-1-schema`)
  - `br-twilight-waterfall-az8c5fyl` (`phase-1-empty-migration-verify`)
- Both branches expire on 2026-08-22.
- The empty verification branch proved the earlier two-file migration chain,
  not the regenerated `0000_windy_beyonder.sql` artifact.
- Neon SQL metadata confirms the current `.env.local` target is not production
  branch `br-dawn-mountain-azrfoy6x`. It already has all ten Phase 1 tables and
  a two-entry Drizzle migration ledger, so it was left unchanged.
- The user chose to proceed with the real production database. Replace
  `.env.local` with the production branch's pooled and direct connection URLs;
  then inspect it read-only before applying the reviewed migration.

## Fresh verification evidence

- `pnpm test` — 6 files, 22 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm exec drizzle-kit check` — passed.
- `pnpm db:generate` — generated `0000_windy_beyonder.sql`, then reported no
  pending schema changes on a fresh rerun.
- Do not treat the previous `pnpm db:check` result as current evidence for the
  final migration: endpoint ownership could not be verified and the earlier
  database ledger/schema predated this artifact and stronger integrity check.
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

1. In Neon, select production branch `br-dawn-mountain-azrfoy6x` and copy its
   pooled and direct connection strings into `.env.local` as `DATABASE_URL` and
   `DIRECT_DATABASE_URL`.
2. Inspect production read-only. If it is the expected empty database, apply
   `0000_windy_beyonder.sql` with `pnpm db:migrate`, rerun the migration, and
   run `pnpm db:check` against both endpoints.
3. Protect the production branch in Neon, record the evidence, and continue
   with Phase 2.
