# Session Notes

## Current backend implementation state

- The approved backend implementation plan is `docs/superpowers/plans/2026-08-08-gym-tracker-backend-implementation.md`.
- Phase 1A-1C, the reviewed build-toolchain fix, and production verification were merged into `main` at `1cf1427`. The linked worktree and fully merged local feature branch were then removed, leaving the project root as the single working checkout.
- The schema uses exact PostgreSQL `numeric` workout loads, generated Better Auth/domain migrations, safe database-check diagnostics, and table-bound live catalog assertions for the Phase 1 contract.
- The root `.env.local` contains the paired production pooled/direct endpoints. It remains ignored, has restrictive local permissions, and no credential is committed.
- Production branch `br-dawn-mountain-azrfoy6x` was identified through Neon SQL metadata, confirmed blank, migrated with `0000_windy_beyonder.sql`, rerun safely, and verified through pooled/direct transactions plus the strict live schema check.
- The database password previously pasted into chat was rotated. Both ignored root `.env.local` URLs were replaced, and pooled/direct connectivity plus strict production schema integrity passed with the rotated credentials.
- Neon branch protection is unavailable on the current Free plan. This limitation is accepted for now; avoid destructive production operations and revisit protection if the project moves to a paid plan.
- Unrelated documentation changes in the main checkout remain user-owned and were not staged by the merge.

## Completed implementation

- Adopted pnpm and a strict Node 24 engine contract. `.node-version` selects Node v24.18.0.
- Added validated database environment handling, Drizzle/Neon clients and configuration, and the generated Better Auth 1.6.26 schema.
- Added the core workout schema, initial migration, migration smoke check, schema-integrity check, and regression coverage.
- Regenerated the initial migration from the final schema. The redundant direct `workout_sets.session_exercise_id` index is omitted because its leading column is already covered by the unique set-position index.
- Strengthened live verification to require exact tables, indexes, ownership, constraint definitions, `numeric` weight storage, and `ON DELETE SET NULL` split-history behavior.
- Database-check failures emit only a fixed safe message, preventing connection credentials from leaking through diagnostics.
- Bound every critical constraint assertion to its expected owning table after production verification exposed the need for relation-aware catalog checks.

## Neon state

- Production branch: `br-dawn-mountain-azrfoy6x`.
- Disposable verification branches created during Phase 1:
  - `br-autumn-silence-az3ob0kj` (`phase-1-schema`)
  - `br-twilight-waterfall-az8c5fyl` (`phase-1-empty-migration-verify`)
- Both disposable branches expire on 2026-08-22.
- The exact final migration was applied to blank production and rerun safely without duplicating schema objects.
- The previous non-production target had ten Phase 1 tables and an old two-entry migration ledger; it was identified and left unchanged.

## Verification evidence

- `pnpm test` - 6 files, 27 tests passed.
- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm exec drizzle-kit check` - passed.
- `pnpm db:generate` - no pending schema changes on the final rerun.
- `pnpm db:migrate` - applied the exact migration to blank production; a second run completed safely.
- `pnpm db:check` - production pooled/direct connectivity, interactive transactions, and live schema integrity passed.
- `pnpm build` - production webpack compilation, TypeScript validation, static generation, and build traces passed under Node 24.
- Task-scoped build, schema, and production reviews found no remaining Critical or Important code findings.

## Build toolchain

- Next 16.3's experimental TypeScript CLI wrapper returned empty captured `--showConfig` output even though `tsc` succeeded. `next.config.ts` uses the stable TypeScript compiler API path supported by TypeScript 5.9.
- The managed host blocks Turbopack's internal port, so the production build script explicitly uses webpack.
- pnpm rejects unsupported Node majors before installation.
- pnpm 11 requires an explicit build-script decision for the optional `bufferutil` native addon pulled by `ws`. `pnpm-workspace.yaml` sets it to `false`; `ws` uses its supported JavaScript fallback while required `esbuild` and `unrs-resolver` scripts remain allowed.

## Phase 2 — Better Auth and user isolation

- Implemented Better Auth 1.6.26 with the Drizzle PostgreSQL adapter, explicit trusted origins, production secure cookies, built-in rate limiting, and a permanent two-email server allowlist.
- Added the official `/api/auth/[...all]` Next.js handler, browser client, existing-style sign-in/sign-up screens, protected server root, optimistic root proxy, authenticated Header identity, and retryable sign-out handling.
- Moved the unchanged mock-backed tabbed interface into `ApplicationShell`; persistence remains owned by later phases.
- Added `requireUser()` through authoritative `auth.api.getSession({ headers })`, `UNAUTHENTICATED` and enumeration-safe `NOT_FOUND` errors, `ActionResult<T>`, and owner-plus-record SQL predicate helpers.
- Split database-only and full application environment parsing so Drizzle Kit and database checks do not require unrelated auth settings.
- Kept `src/auth.ts` as the Better Auth CLI entrypoint and `src/lib/auth.ts` as the Next.js runtime entrypoint with the `server-only` marker and `nextCookies()` plugin.
- Better Auth schema regeneration exactly matched `src/db/schema/auth.ts`; Phase 2 requires no migration.
- Added `server-only@0.0.1` as an explicit runtime boundary dependency.

## Phase 2 verification

- Exact runtime: Node v24.18.0 and pnpm 11.20.0.
- `pnpm install --frozen-lockfile` - passed.
- `pnpm test` - 10 files and 42 tests passed; the three opt-in PostgreSQL tests were skipped in the normal run.
- Disposable Neon branch `br-patient-resonance-azqw4lwn` (`phase-2-auth-isolation-verify`, expires 2026-08-15) - all three live cross-user read/update/delete denial tests passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` - passed.
- `pnpm db:generate` - no schema changes; `pnpm exec drizzle-kit check` - passed.
- `pnpm db:check` - configured production pooled/direct transactions and schema integrity passed; no production data was changed.
- Better Auth in-memory endpoint tests cover allowlisted registration, non-allowlisted rejection, sign-in, session retrieval, sign-out, forged cookies, and production `Secure` cookies.
- Production-build browser verification covered protected redirect, allowlisted registration on the disposable branch, refresh persistence, sign-out, existing-account sign-in, non-allowlisted rejection, keyboard focus, mobile/desktop rendering, console/request health, and forced sign-out failure recovery.
- Final auth screenshots were captured at 1280x720 and 390x844. The Impeccable detector returned no findings; the independent finish review's two findings (input-boundary contrast and sign-out failure recovery) were fixed, reverified, and received a final Pass.
- The 2026-08-09 closeout reran the full code and schema gate on Node v24.18.0, reconfirmed pooled/direct production connectivity and schema integrity, and smoke-tested the production build: unauthenticated `/` redirected to `/sign-in`, `/sign-up` rendered, and a non-allowlisted registration returned HTTP 400.
- The closeout found one root `main` worktree and no linked worktrees to merge or remove. Drizzle generated no changes and the Better Auth schema remained byte-for-byte identical, so no database migration or push was required.

## Phase 2 production activation

- Hosted production auth is active at `https://einherjar-tracker.vercel.app`. The canonical base URL and trusted origin use that exact origin without a trailing slash.
- Live verification on 2026-08-09 confirmed unauthenticated root redirect, rendered sign-in/sign-up pages, a signed-out `null` session response, and HTTP 400 rejection for a non-allowlisted registration request.
- The ignored `.env.local` contains the paired production database URLs plus local-only auth settings. The separately ignored temporary `.env` contains the Vercel import values, has mode `600`, and remains uncommitted at the user's request.
- On 2026-08-09, local auth was activated with a freshly generated local secret, `http://localhost:3000` as the base/trusted origin, and the two user-provided allowlisted addresses. No account rows were created by this configuration change; each allowlisted user must still complete sign-up.
- Before deploying or registering the two real accounts, add a generated `BETTER_AUTH_SECRET`, the canonical `BETTER_AUTH_URL`, exactly two real `BETTER_AUTH_ALLOWED_EMAILS`, and exact localhost/preview/production `BETTER_AUTH_TRUSTED_ORIGINS`.
- Do not copy the disposable browser-test email addresses or test secret into production configuration.

## Next handoff

1. Create the two allowlisted accounts through the live sign-up page; do not share either password.
2. Continue with Phase 3 of `docs/superpowers/plans/2026-08-08-gym-tracker-backend-implementation.md` from the root `main` checkout.
3. Keep production branch `br-dawn-mountain-azrfoy6x` as the configured target and do not reset or delete it.
