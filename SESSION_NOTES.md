# Phase 1 Session Notes

## Scope and worktree

- Active implementation worktree: `.worktrees/phase-1-neon-drizzle`
- Branch: `phase-1-neon-drizzle`
- Phase 1C is committed at `6c125f0`; the review remediation is committed as
  its follow-up fix.
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
- Current `.env.local` endpoint hostnames match neither documented disposable
  branch nor the documented production branch. No migration, reset, or new
  database check may run against that unverified target.
- User action in Neon is not required now. Before deploying or using production data, get explicit approval to apply reviewed migrations and configure production secrets.

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

## Build limitation

- `pnpm build` remains blocked before application compilation because Turbopack
  cannot bind its internal port (`Operation not permitted`).
- The unchanged fallback `pnpm exec next build --webpack` completed successfully:
  compilation, TypeScript, static-page generation, and trace collection all
  passed on Node v26.5.0.
- Keep the repository configuration unchanged. The failing default build is a
  host/Turbopack limitation; use a host that permits the worker port, or obtain
  explicit approval before changing the local runtime/toolchain.

## Next step

1. Obtain a verified fresh, disposable non-production Neon database/branch and
   set only its pooled/direct URLs in `.env.local`.
2. Inspect that target, apply `0000_windy_beyonder.sql` with `pnpm db:migrate`,
   rerun `pnpm db:migrate`, then run `pnpm db:check` against both endpoints.
3. Continue with Phase 2 only after that handoff is accepted.
