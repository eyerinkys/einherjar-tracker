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

## Phase 3A — built-in exercise seed and read adapter

- Added the explicit `pnpm db:seed` entrypoint for the nine approved built-in exercises. It is safe by default because it only connects when explicitly invoked; it was not run against the configured production target during this implementation.
- Built-ins use stable UUID primary keys and an `ON CONFLICT (id) DO UPDATE` statement that corrects canonical metadata on reruns without creating duplicates. Every corrected built-in is forced to `created_by_user_id = NULL` and `is_custom = false`.
- Added server-only `getExercises(userId)`, which selects explicit UI fields only, returns shared built-ins plus future custom exercises owned by the trusted user, excludes foreign/custom malformed rows, and orders by name then ID deterministically.
- Added an explicit database-row-to-`Exercise` DTO mapper so timestamps and other database-only fields are not leaked to the UI. Custom exercise creation and all UI paths remain unchanged.

## Phase 3A verification

- Runtime: Node v24.18.0 via `/tmp/einherjar-node24/node_modules/node/bin` and pnpm 11.20.0.
- Focused seed/query suite: 2 files, 6 tests passed.
- Full `pnpm test`: 12 files passed, 1 opt-in PostgreSQL file skipped; 48 tests passed and 3 skipped.
- `pnpm typecheck` and `pnpm lint`: passed.
- No migration, schema push, production seed, or other production data mutation was run.

## Phase 3A Fix Round 1

- `pnpm db:seed` now loads the documented root `.env.local` before database environment parsing, then always closes its Neon client after a successful or failed one-off seed attempt.
- Seed persistence is now expressed through an atomic exercise-seed database adapter. The production adapter executes the existing Drizzle stable-ID upsert, while normal tests execute `seedBuiltInExercises` against a stateful in-memory adapter to prove first insert, rerun idempotency, and corrupted-row correction.
- Added CLI lifecycle coverage using a temporary env file only; it proves environment loading precedes seeding and that the database client closes on both success and failure without connecting to the configured production target.
- Fresh verification under Node v24.18.0: focused seed/CLI suite 6 passed; full suite 52 passed with 3 opt-in PostgreSQL tests skipped; `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. No production seed or migration command was run.

## Phase 3B — persistent user-owned splits

- Added bounded Zod contracts for all eight split Server Actions. Split days are capped at 50 per user, exercises at 50 per day, names at 100 trimmed nonblank characters, target sets at 1-20, reps at 1-100 with `min <= max`, and notes at 1,000 characters. Reorder inputs reject malformed, duplicate, replayed, oversized, and client-supplied ownership fields.
- Added server-only `getSplitDays(userId)`, explicit joined-row-to-DTO mapping, stable database ordering by stored sort order plus ID, and gapless DTO order values without leaking database-only fields.
- Added authenticated `createSplitDay`, `renameSplitDay`, `deleteSplitDay`, `reorderSplitDays`, `addSplitExercise`, `removeSplitExercise`, `reorderSplitExercises`, and `updateSplitExercise` actions. Every action resolves the owner through `requireUser()` and returns the authoritative updated `SplitDay[]` in `ActionResult<T>`.
- All child updates/deletes resolve ownership through `split_exercises -> split_days`; foreign and missing resources return the same safe `NOT_FOUND` result. Exercise additions accept only shared built-ins or future custom exercises owned by the authenticated user.
- Create/delete/add/remove/reorder paths normalize stored order gaplessly. Reorders lock the owning user or split-day parent row inside an interactive transaction, re-read the current owned IDs after the lock, require the exact list, return `NOT_FOUND` for submitted foreign/deleted IDs, and return `STALE_ORDER` for owned incomplete lists.
- Added deterministic unit coverage plus an opt-in PostgreSQL suite (`RUN_SPLIT_DATABASE_TESTS=1` with `SPLIT_TEST_DATABASE_URL`) for all mutations, persistent limits, ownership denial, visible-exercise enforcement, normalization, exact-list rejection, and lock-then-concurrent-deletion behavior.

## Phase 3B verification

- Runtime: Node v24.18.0 via `/tmp/einherjar-node24/node_modules/node/bin` and pnpm 11.20.0.
- Final focused split suite: 42 tests passed; 4 opt-in PostgreSQL tests skipped because no split test database was configured.
- Full `pnpm test`: 17 files passed, 2 opt-in PostgreSQL files skipped; 94 tests passed and 7 skipped.
- `pnpm typecheck` and `pnpm lint`: passed.
- Independent transaction/security review found one Important reorder error-classification mismatch; it was corrected and the fix round was approved with no regression found.
- No migration, schema push, production seed, or production data mutation was run.

## Phase 2 production activation

- Hosted production auth is active at `https://einherjar-tracker.vercel.app`. The canonical base URL and trusted origin use that exact origin without a trailing slash.
- Live verification on 2026-08-09 confirmed unauthenticated root redirect, rendered sign-in/sign-up pages, a signed-out `null` session response, and HTTP 400 rejection for a non-allowlisted registration request.
- The ignored `.env.local` contains the paired production database URLs plus local-only auth settings. The separately ignored temporary `.env` contains the Vercel import values, has mode `600`, and remains uncommitted at the user's request.
- On 2026-08-09, local auth was activated with a freshly generated local secret, `http://localhost:3000` as the base/trusted origin, and the two user-provided allowlisted addresses. No account rows were created by this configuration change; each allowlisted user must still complete sign-up.
- Before deploying or registering the two real accounts, add a generated `BETTER_AUTH_SECRET`, the canonical `BETTER_AUTH_URL`, exactly two real `BETTER_AUTH_ALLOWED_EMAILS`, and exact localhost/preview/production `BETTER_AUTH_TRUSTED_ORIGINS`.
- Do not copy the disposable browser-test email addresses or test secret into production configuration.

## Phase 3C — persistent Split UI integration

- The protected server root now authenticates, loads the exercise library and current user's split in parallel, and passes those serializable DTOs into `ApplicationShell`.
- The Split screen and Progress exercise selector no longer read mock exercise/split data. A fixed nine-built-in UUID adapter preserves the existing mock-backed progression/AI/PR datasets without making the mock exercise library authoritative again. `ApplicationShell` owns the authoritative current split state and continues passing that same state to the mock-backed Train screen until Train persistence's owning phase.
- Connected create, rename, delete, and reorder day controls plus add, remove, reorder, and edit target/rep/notes controls to the eight authenticated Phase 3B Server Actions.
- Successful operations reconcile the entire split from the authoritative action result. Failures retain persisted state and relevant drafts/confirmations, expose inline retry for retryable errors, and use refresh recovery for stale/missing resources.
- Added bounded client validation, inline delete/remove confirmations, live error/success feedback, semantic labels, mobile 44px targets and wrapping layouts, keyboard-operable day tabs, pending-navigation containment, add-dialog focus trapping while idle or pending, and logical post-success focus recovery while preserving the incumbent Norse charcoal/bone/moss UI.
- Added jsdom/React Testing Library behavior coverage for server hydration and parallel queries, all eight mutation success/failure paths, validation, pending/duplicate prevention and navigation containment, confirmation, authoritative reconciliation/refresh, downstream Train/Progress data, responsive contracts, and accessible controls.

## Phase 3C verification

- Runtime: Node v24.18.0 via `/tmp/einherjar-node24/node_modules/node/bin` and pnpm 11.20.0.
- Final pre-review focused Phase 3C suite: 2 files and 40 tests passed.
- Full `pnpm test`: 19 files passed, 2 opt-in PostgreSQL files skipped; 134 tests passed and 7 skipped.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`: passed.
- The one required Impeccable detector run returned `[]` at the UI integration checkpoint. Later review fixes were validated with behavior tests, lint, typecheck, and build; the detector was not rerun because the task capped it at one invocation.
- The original deterministic gate used server-action/query mocks and did not connect to or mutate a database. Hosted verification was performed later and is recorded below.
- The final bounded review confirmed the Progress UUID compatibility and pending empty-state guard, with no remaining Critical or Important findings.
- A later independent task review found stale-refresh status and inline-cancellation focus defects. Both were fixed in `2ee60c0`; the scoped re-review approved both fixes with no new breakage.
- Fresh controller verification after `2ee60c0`: the page/Split focused suite passed 44 tests; `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed.
- Per the user's request, the already-passed full suite, standalone typecheck, and lint gates were not rerun. A fresh Node v24.18.0 production build of current source was required for valid browser evidence and passed; `git diff --check` was rerun only after this handoff edit and passed.

## Hosted Phase 3 verification — 2026-08-09

- Root `.env` resolved without printing credentials to hosted Neon branch `br-dawn-mountain-azrfoy6x`, database `neondb`; `.env.local` did not interfere and was retained.
- The hosted Drizzle ledger contains one entry whose hash `89ec6ab0f0d728be026182413afcee0f826bde7c14bb621cc192adf49642a6d4` exactly matches `drizzle/0000_windy_beyonder.sql`. Both Split tables exist, so no migration write or schema push was needed.
- The idempotent built-in exercise seed completed against the hosted database. A field-for-field query verified all nine canonical IDs and attributes: 9 exact rows, 0 missing, 0 mismatched.
- The two opt-in PostgreSQL files ran under Node v24.18.0 against the hosted database: 4 tests passed and 3 failed. All three ownership tests passed; one Split limit test passed.
- The other three Split integration tests fail with PostgreSQL `42601` because `ownedSplitExerciseWhere` calls Drizzle `exists(sql\`select ...\`)`, which generates invalid SQL shaped as `... and exists select 1 ...` without subquery parentheses. This blocks exercise update, removal, reorder, and adding after a day already has an exercise.
- The integration teardown also leaked the two custom `Phase 3B` exercise fixtures: deleting their users sets `created_by_user_id` to null, while teardown deletes only the built-in fixture. The two exact leaked rows were removed; final Phase 2/3 integration fixture users, Split days, and `Phase 3B` exercises were all verified at zero.
- A source-current Node v24.18.0 production build was used for real Chromium walkthroughs at desktop 1440x1000 and iPhone-emulated 393x659. Both layouts had zero horizontal overflow; the mobile empty-state action cleared the fixed bottom navigation by 84 px.
- Browser success evidence: create day, rename day, reorder days, first exercise add, and delete day persisted after refresh on both desktop and mobile. Rejected target-set drafts reverted to the stored value after refresh. Keyboard day-tab navigation and focus restoration after rename, dialog close, remove cancellation, and delete cancellation worked.
- Browser failure evidence matches PostgreSQL: target update, second exercise add (including Retry), exercise reorder, and exercise removal all showed `Unable to update the split. Please try again.` and did not mutate the hosted rows.
- Both browser sessions reported 0 console errors/warnings; all captured auth, RSC, and server-action requests returned HTTP 200. Screenshots showed the desktop rail and mobile bottom navigation rendering without clipping; mobile controls and dialog remained within the viewport.
- The scoped browser account and all dependent auth/session/Split rows were deleted. Final counts for that user, accounts, sessions, Split days, and leaked `Phase 3B` exercises were zero. Temporary browser, screenshot, launcher, and generated agent-rule files were removed.
- Those failures were repaired and reverified in the closeout below; this section remains as the original failure record.

## Hosted Phase 3 closeout — 2026-08-09

- Added a focused SQL-generation regression assertion first and observed it fail against the malformed `exists select 1 ...` output. `ownedSplitExerciseWhere` now emits a parameterized correlated `exists (select 1 ...)` expression while retaining both the Split-exercise ID and owning-user predicates; the focused unit file then passed 9/9 tests.
- The Split PostgreSQL teardown now deletes both exact custom exercise fixture IDs before deleting their users, preventing `ON DELETE SET NULL` from orphaning those rows.
- Reran only the two opt-in PostgreSQL files under Node v24.18.0 against the root `.env` hosted Neon target: 2 files passed, 7 tests passed, 0 skipped, 0 failed. A follow-up hosted query returned 0 Phase 2/3 fixture users, 0 fixture Split days, and 0 `Phase 3B` fixture exercises.
- Built current source once because the changed Server Action code had to be present for browser verification. The Node v24.18.0 webpack production build compiled, completed TypeScript, and generated all 6 pages successfully. No standalone typecheck, lint, unrelated full suite, or already-passed day-operation browser checks were rerun.
- On real headless Chromium at desktop 1440x1000 and iPhone 15 emulation 393x659, repeated only the four formerly failing operations. Target update, second exercise add, exercise reorder, and exercise removal all reconciled successfully and persisted after refresh on both viewports. Both sessions ended with 0 console errors and 0 warnings.
- The browser walkthrough used one exact temporary allowlisted account and a directly seeded one-day/one-exercise setup so already-verified setup operations were not repeated. The account was deleted afterward; hosted read-back confirmed 0 users, accounts, sessions, Split days, and verification rows for it.
- Phase 3 is closed: hosted migration/seed parity is confirmed, all 7 PostgreSQL ownership/transaction tests pass, all 8 Split mutations have real desktop/mobile persistence evidence, and no verification fixtures remain.

## Hosted database authorization — 2026-08-09

- The user explicitly ended disposable-database usage for this project because it consumes too much time and tokens.
- From this point forward, use the hosted database for implementation and verification whenever database access is needed, including Phase 3 closeout and later phases.
- The ignored root `.env` is the authoritative credential source. Do not create another disposable Neon branch or wait for a disposable database URL.
- `.env.local` may be deleted if it interferes with loading `.env`, but deletion is not required merely because both files exist. Prefer explicitly preloading `.env`; if `.env.local` is removed, record that deletion and confirm no credential is committed.
- This is explicit authorization to run the necessary reviewed migration, seed, integration-test fixture, and browser-verification operations against the hosted database. Keep operations scoped, avoid destructive resets, clean up test fixtures, and continue to distinguish hosted verification from deployment.
- Hosted verification has now been performed as recorded above; it did not deploy application code or reset/delete the hosted branch.
- Current Phase 3 implementation commits are `702aaaa`, `7a79066`, `957a9cf`, `2e5aa40`, `e008530`, and `2ee60c0`. The current scoped closeout changes are the Split ownership predicate, its SQL regression assertion, the integration fixture teardown, and this handoff; the pre-existing `RULES.md` edit remains preserved.

## Phase 4 — persistent workout logging

- Added server-only active-workout reads and explicit serializable DTO mapping for session/exercise/set snapshots, exact PostgreSQL numeric conversion, stable database IDs, notes, timestamps, and optimistic versions.
- Added bounded Zod contracts and four authenticated Server Actions: `startWorkout`, `saveWorkoutDraft`, `discardWorkout`, and `completeWorkout`. Client inputs cannot supply owners, names, timestamps, duration, or snapshot values.
- Starting a workout locks the authenticated user, returns an existing active session when present, verifies an owned non-empty Split day, snapshots its name/exercise order/targets/notes, and creates incomplete draft slots. The most recent completed set values prefill matching slots when available; no progression or Groq call runs in the transaction.
- Draft saves replace the complete owned set structure atomically, retain stable set IDs, normalize set numbers, update notes, and increment `version`. Missing/foreign IDs return enumeration-safe `NOT_FOUND`; stale versions or incomplete owned structures return `CONFLICT` without overwriting the newer draft.
- Completion applies the submitted draft and closes the workout in one transaction, requires at least one completed set, rolls back invalid completion attempts, deletes incomplete placeholders, derives completion time/duration on the server, and leaves the stored Split/exercise snapshot immutable. Retried completion cannot create a duplicate completed session.
- Discard requires the owner and current active version, then relies on the existing cascade to remove the draft. The Phase 1 partial unique index remains the database backstop for one active workout per user; no schema change or migration was required.
- The protected root now loads exercises, Split days, and the active workout in parallel. Train starts explicitly, resumes after refresh/sign-in, keeps typing local until Save/Finish, supports direct mobile numeric entry plus add/remove/toggle controls, preserves edits on errors, exposes reload recovery for conflicts, contains duplicate submissions/navigation while pending, confirms discard inline, and displays server-derived duration after completion.
- Removed Train's direct workout-history/progression mock reads. History remains mock-backed until its owning Phase 5; completing Phase 4 does not synthesize a client-only history record.

## Phase 4 verification

- Runtime: Node v24.18.0 and pnpm 11.20.0.
- Test-first focused cycles covered validation, DTO mapping, action authentication/error redaction, ownership/concurrency invariants, server hydration, direct numeric editing, stable set add/remove, save/reload, stale conflict recovery, discard confirmation, completion, deleted-day fallback, and the protected final set.
- Final local gate: `pnpm test` passed 24 files and 169 tests with 3 opt-in files / 8 tests skipped; `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check` passed.
- The strengthened opt-in PostgreSQL suite ran against hosted branch `br-dawn-mountain-azrfoy6x` through the mode-600 root `.env`: 1 file and 1 end-to-end transaction test passed. It exercised active-session reuse plus the unique index, save/reload, stale versions, cross-user start/save/discard/complete denial, atomic invalid-completion rollback, snapshot survival after Split rename/target edit/deletion, incomplete-set filtering, idempotent completion retry with one stored session, and exact fixture cleanup assertions.
- A source-current Node v24.18.0 webpack production build passed after the four exported Server Actions were declared with Next.js's required `async` syntax.
- The one bounded Impeccable detector run returned `[]` for the changed Train/SetEntry/ApplicationShell surfaces.
- Real Chromium verification used an exact temporary allowlisted account against the local production bundle and hosted database. On iPhone 15 emulation (393x659), numeric entry, completion toggle, add/remove, Save, reload/resume, and Finish persisted; the completed result displayed a server-derived 3-minute duration. Desktop 1440x1000 and mobile both had `scrollWidth === innerWidth`; the final console reported 0 errors and 0 warnings. Screenshots were inspected and then kept only in `/tmp`.
- The temporary browser user was deleted by exact email after verification; the delete cascaded its Split/workout/auth rows, and read-back returned 0 remaining users for that email. The temporary Playwright workspace directory was removed. No deployment was performed.

## Phase 4 power-cut recovery — 2026-08-09

- Recovered the complete uncommitted Phase 4 working tree from the root checkout and checked it against the approved Phase 4 plan before making further changes.
- Added a failing transport-interruption regression after confirming that a rejected Server Action left Train controls and app navigation permanently pending. All four workout mutations now share guarded `try`/`catch`/`finally` handling, retain the local draft, show a safe retryable error, and always release pending state.
- Added a failing deleted-source-Split regression after review found that an active snapshot-backed workout was hidden when `splitDays` became empty. Train now prioritizes an existing active workout, so save, finish, and discard remain available after the last source Split day is deleted.
- Fresh Node v24.18.0 recovery gate: the focused Train suite passed 9 tests; the full suite passed 24 files and 171 tests with 3 opt-in files / 8 tests skipped; `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
- Final independent re-review confirmed both recovery defects resolved, with no remaining Critical or Important findings. The transaction implementation, schema, and hosted target were unchanged, so the already-recorded hosted PostgreSQL/browser evidence was preserved and no database mutation, browser account, migration, or deployment was performed during recovery.

## Next handoff

1. Begin Phase 6 — Deterministic Progression Engine from `docs/superpowers/plans/2026-08-08-gym-tracker-backend-implementation.md`.
2. Continue using hosted branch `br-dawn-mountain-azrfoy6x` through the ignored root `.env`; do not create a disposable database branch or reset/delete the hosted branch.
3. Preserve the closed Phase 3, Phase 4, and Phase 5 evidence above. Rerun their hosted/browser checks only when a later change touches those transaction, ownership, history, or UI paths.

## Phase 5 — previous performance and factual history

- Added owner-scoped completed-session pagination, completed-session detail, per-exercise history, and shared previous-performance selection. The stable cursor orders by `(completed_at DESC, id DESC)`, defaults to 20, caps at 50, and carries both ordering fields.
- Completed history maps only completed sessions and completed sets, preserves snapshot names/targets/notes and nullable deleted source Split IDs, derives duration from stored UTC timestamps, and converts PostgreSQL numeric load only at the frontend DTO boundary.
- Authenticated history Server Actions accept only strict Zod-validated cursor/page/session/exercise inputs and derive ownership through `requireUser()`. Missing and foreign records remain enumeration-safe `NOT_FOUND` results.
- Active-workout reads and start/save hydration share the same latest-eligible previous-performance selector. It uses a strict pre-active-session cutoff, supports nullable bodyweight loads, retains set numbers, preserves missing positions, and keeps exact numeric text until DTO mapping or database reuse.
- The protected root now starts exercise-library, split, active-workout, and first-page completed-history reads in parallel for the authenticated user. The first visible exercise history begins as soon as the exercise library resolves, without serializing unrelated reads.
- `ApplicationShell` receives serializable completed-history and initial exercise-history DTOs. History screens use the incumbent source/value reconciliation pattern so a server refresh replaces stale client pages.
- History now renders factual completed-session snapshots, local calendar dates through `Intl.DateTimeFormat`, duration, notes, completed sets, nullable bodyweight loads, and weighted volume. Cursor pagination prevents duplicate requests and session duplication, retains the current page/cursor on failure, and retries safely.
- Exercise Detail retains the later-phase mock progression, PR, chart, and AI surfaces, while its historical-session ledger is now exclusively factual. Exercise changes use the authenticated history action, safe loading/error/retry/empty states, and explicit request ordering so stale responses cannot overwrite a newer selection.
- Previous-performance DTOs now retain their database set number. Train matches prior results by set position, displays nullable loads as bodyweight, leaves missing positions on the existing honest fallback, and refreshes server props after successful completion without replacing the completion success state.
- Removed `getWorkoutHistory()` from the production data service and application shell. The legacy fixture file remains only as an unrelated test/mock asset.
- Final controller gate under Node v24.18.0/pnpm 11.20.0: full `pnpm test` passed 30 files and 218 tests with 3 opt-in files / 8 tests skipped; `pnpm typecheck`, `pnpm lint`, current-source `pnpm build`, `git diff --check`, and clean status passed. The single bounded Impeccable detector run returned `[]`.
- Fix Round 1 (`ExerciseDetailView` refresh reconciliation): a refreshed first-exercise history prop now resets a non-initial selection and ledger together through the same source/value pattern, preventing an indefinite loading fallback. The focused regression passed 7/7; page/shell/exercise coverage passed 18/18; typecheck, lint, and diff-check passed. No server/client boundary changed, so the build was not rerun; the single-use Impeccable detector was not rerun.
- Independent task reviews found and closed four Important issues: exact numeric prefill round-tripping, nullable previous weights, gapped set-number prefill, and refreshed non-initial exercise selection. Both task fix rounds were approved with no remaining Critical or Important finding. One Minor remains documented: two local-date component tests depend on the host timezone instead of pinning it.
- The final whole-phase review returned `Ready to merge: Yes` with 0 Critical and 0 Important findings. It retained two bounded Minors for later hygiene: the timezone-dependent date assertions and the History header describing the currently loaded page count as total sessions logged while another cursor exists.
- No schema or migration change was required. Phase 5 commits are `0dc10f2`, `4621841`, `0eddb30`, `a853ec9`, and `bc782c4`.

## Hosted Phase 5 verification — 2026-08-09

- The mode-600 root `.env` resolved without printing credentials to hosted Neon database `neondb`, branch `br-dawn-mountain-azrfoy6x`. `.env.local` was retained; explicit environment preloading kept `.env` authoritative.
- Created two exact temporary allowlisted accounts, then inserted one scoped transaction: User A received 22 completed Bench Press snapshots plus one active workout; User B received one foreign completed-session sentinel. No schema, migration, seed, reset, or unrelated production row changed.
- The current production bundle ran locally against the hosted database. Desktop 1440×1000 verified immediate previous performance at set positions 1 and 3 with the missing set 2 left as `First set`, including `82.5kg × 5` and `Bodyweight × 12`.
- History loaded the newest 20 owned sessions, expanded factual snapshot notes/targets/sets, and paginated to exactly 22 unique sessions. `Load more` then disappeared; the foreign session/name never rendered.
- Exercise Detail rendered exactly 22 chronological factual Bench Press sessions, preserved the historical exercise name/targets/notes, showed the weighted/bodyweight sets, switched to an honest empty Lat Pulldown history, and reloaded the populated Bench Press ledger.
- Desktop 1440×1000 and mobile 393×659 both reported `scrollWidth === innerWidth`. Inspected screenshots showed the incumbent charcoal/bone/moss hierarchy, desktop rail, mobile bottom navigation, wrapped metadata, expanded snapshot card, and unclipped factual set chips. The final browser console contained 0 errors and 0 warnings; observed auth, RSC, and Server Action requests returned HTTP 200.
- The two exact temporary users were deleted; cascades removed their auth and workout rows. Hosted read-back verified 0 temporary users, 0 accounts, and 0 workout sessions. The localhost server, browser session, screenshots, response files, fixture script, and temporary Playwright workspace were removed.
- No application deployment occurred.
