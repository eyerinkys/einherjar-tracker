# Gym Tracker Backend Implementation Plan

> **For agentic workers:** Implement one subphase at a time with review and verification between commits.

**Target file:** `docs/superpowers/plans/2026-08-08-gym-tracker-backend-implementation.md`

**Goal:** Replace the approved mock-backed frontend with a secure, user-isolated Neon/Drizzle backend, deterministic training analysis, optional Groq guidance, private R2 photos, and a production-ready PWA without redesigning the UI.

**Architecture:** Keep one Next.js repository. Preserve the existing screen/view-model types where sensible, but replace synchronous mock getters incrementally with server-only queries, Zod-validated Server Actions, and narrowly justified Route Handlers. Completed workout history remains the sole source of truth for PRs, progression, graphs, analytics, and AI context.

**Tech stack:** Next.js 16, React 19, TypeScript, Neon PostgreSQL, Drizzle ORM/Kit, Better Auth, Zod, Groq, Cloudflare R2, Recharts, Vercel, pnpm.

## Global Constraints

- Preserve the approved frontend structure, visual identity, navigation, and mobile-first interaction model.
- Never accept ownership from a client-supplied `userId`; derive it from the validated server session.
- Validate every action and route-handler input with Zod.
- Use Server Actions for normal application reads/mutations and Route Handlers only for Better Auth, Groq if needed, and presigned R2 operations.
- Use Node runtime for authenticated database operations; Drizzle’s Neon WebSocket driver is preferred because workout and reorder mutations need interactive transactions. Neon HTTP remains suitable only for isolated queries. [Drizzle Neon guide](https://orm.drizzle.team/docs/get-started/neon-new)
- Generate and commit SQL migrations and metadata; use `drizzle-kit migrate`, not `push`, against shared or production databases. [Drizzle migration documentation](https://orm.drizzle.team/docs/kit-overview)
- Derive PRs and progression from completed workout history. Do not persist fabricated PR facts or let Groq determine objective status.
- Do not add custom exercises, measurements, nutrition, timers, offline synchronization, admin tooling, or public APIs.
- Keep the architecture appropriate for two users: no queues, microservices, Redis, separate API service, or analytics warehouse.
- All dates displayed as local calendar dates; session timestamps remain UTC `timestamptz`.
- Store weights exactly as PostgreSQL `numeric`, map them to frontend numbers at the DTO boundary, and display kilograms.
- Tests introduced in Phase 1 use Vitest; browser-level production verification in Phase 13 uses Playwright.

## Stable Interfaces and Boundaries

- Retain `src/types/*` as UI-facing DTOs, updating them only when persisted behavior requires IDs, status, snapshot, or loading-state fields.
- Split the current `dataService` boundary into:
  - `src/server/queries/*`: server-only Drizzle reads that always require a trusted `userId`.
  - `src/actions/*`: Zod-validated Server Actions that call `requireUser()`.
  - `src/lib/validation/*`: shared input schemas.
  - `src/lib/mappers/*`: database rows to existing UI DTOs.
- Introduce:
  - `requireUser(): Promise<AuthenticatedUser>`
  - `ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string,string[]> }`
- Refactor the current client-only `src/app/page.tsx` into a protected server entry plus a client application shell receiving initial DTOs. Keep the existing tabbed interface rather than introducing a route-per-tab redesign.
- Private query functions may accept a trusted `userId` internally. Client-callable actions and routes must never expose or accept `userId`.

---

## Phase 1 — Neon + Drizzle Foundation

### Subphases

- **1A — pnpm, dependencies, environment contract**
- **1B — Neon/Drizzle clients and schema**
- **1C — initial migration and database verification**

1. **Goal:** Establish the package-manager, environment, database, migration, schema, and testing foundations needed by every later phase.

2. **Deliverables:**
   - Convert the repository from npm lockfile ownership to pnpm.
   - Add Drizzle, Neon, Zod, Better Auth schema-generation dependencies, Vitest, and database scripts.
   - Add validated server environment configuration.
   - Add pooled application and direct migration connections.
   - Add the initial relational schema and generated SQL migration.
   - Document local/dev/test/production migration workflow.

3. **Likely files/areas affected:**
   - `package.json`, lockfiles, `.gitignore`, `.env.example`
   - `drizzle.config.ts`, `drizzle/`
   - `src/db/client.ts`, `src/db/schema/*`
   - `src/lib/env.ts`
   - test configuration and database smoke tests

4. **Database/schema changes:**
   - Better Auth canonical `user`, `session`, `account`, and `verification` tables generated from the installed Better Auth version; do not hand-maintain a divergent auth schema. [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
   - `exercises`: shared built-ins plus nullable future ownership fields, timestamps, category constraint.
   - `split_days`: `user_id`, name, sort order, timestamps.
   - `split_exercises`: parent day, exercise, sort order, target sets, rep minimum/maximum, optional notes.
   - `workout_sessions`: owner, nullable source split day, snapshot name, status, start/completion timestamps, notes, version, timestamps.
   - `session_exercises`: session, exercise reference, snapshot exercise name/order/targets/notes.
   - `workout_sets`: session exercise, set number, nullable draft weight/reps, completion flag, timestamps.
   - Index every foreign key and common ownership/history path.
   - Add checks for non-empty names, positive target sets/reps, `target_rep_min <= target_rep_max`, non-negative load, and positive completed-set reps.
   - Add a partial unique index permitting at most one `in_progress` workout per user.
   - Use `ON DELETE SET NULL` for a deleted split-day reference on history; retain snapshot fields and completed history.
   - Defer `training_profiles`, AI cache, bodyweight, and photo metadata to their owning phases.

5. **Dependencies:** Phase 0 baseline; Neon project/branch and connection URLs; pnpm installation.

6. **Implementation substeps:**
   - Install pnpm and declare an exact `packageManager` version.
   - Remove `package-lock.json` only after `pnpm-lock.yaml` is generated and install succeeds.
   - Add `db:generate`, `db:migrate`, `db:check`, `db:studio`, `typecheck`, and test scripts.
   - Define `DATABASE_URL` as the pooled runtime URL and `DIRECT_DATABASE_URL` as the direct migration URL.
   - Validate server-only environment variables with Zod and fail with redacted, actionable errors.
   - Configure `drizzle-orm/neon-serverless` for runtime transactions and direct credentials in Drizzle Kit.
   - Generate Better Auth’s current schema through its CLI, then compose domain schema around its user ID type.
   - Generate and manually review the initial SQL migration for constraints, indexes, delete behavior, and accidental destructive statements.
   - Apply the migration only to a disposable development/test branch.
   - Add a connection smoke test and schema-integrity test.
   - Record the migration workflow in the repository README.

7. **Acceptance criteria:**
   - Fresh `pnpm install --frozen-lockfile` succeeds.
   - Environment parsing rejects missing or malformed database URLs without printing credentials.
   - A blank test database can be migrated from zero to current.
   - Running migrations twice is safe.
   - Drizzle queries and an interactive transaction succeed.
   - Schema checks and TypeScript compilation pass.
   - No client bundle imports database or secret configuration.

8. **Tests/verifications:**
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build`
   - `pnpm db:check`
   - Apply migrations to a disposable Neon branch and run `SELECT`/transaction smoke tests.
   - Inspect generated SQL and `git diff --check`.

9. **Security/data ownership concerns:**
   - Keep pooled/direct URLs server-only.
   - Never use production credentials in tests.
   - Do not log environment values or full database errors containing connection strings.
   - Schema ownership columns are necessary but not sufficient; authoritative query scoping is implemented in Phase 2.
   - PostgreSQL RLS is intentionally deferred because the application uses one server role and Better Auth does not automatically establish a per-request database identity. Server query scoping plus adversarial ownership tests is the v1 control.

10. **Risks or negotiable decisions:**
    - Exact dependency versions must be pinned from current compatible releases during implementation.
    - Neon branch naming is negotiable; recommended minimum is `main` for production and one disposable `development`/test branch.
    - The current machine has Node `v26.5.0` but no `pnpm` or `corepack`; pnpm installation is a hard Phase 1 prerequisite.
    - Better Auth schema output must be regenerated if its version changes before implementation.

11. **Recommended commit boundaries:**
    - `chore: adopt pnpm and add backend dependencies`
    - `chore: add validated database environment and clients`
    - `feat: add initial auth and workout schema migration`
    - `test: verify migrations and Neon transactions`

---

## Phase 2 — Better Auth + User Isolation

### Subphases

- **2A — Better Auth server/client and allowlisted registration**
- **2B — sign-in/sign-up UI and protected application shell**
- **2C — authorization helpers and cross-user security tests**

1. **Goal:** Authenticate the two users and make validated server identity the mandatory root of every private operation.

2. **Deliverables:**
   - Better Auth email/password configuration.
   - `/api/auth/[...all]` handler.
   - Existing-style sign-in/sign-up screens.
   - Server-side normalized-email allowlist.
   - Protected root application and sign-out.
   - `requireUser()` and reusable ownership-safe query conventions.

3. **Likely files/areas affected:**
   - `src/lib/auth.ts`, `src/lib/auth-client.ts`
   - `src/app/api/auth/[...all]/route.ts`
   - `src/app/sign-in/`, `src/app/sign-up/`
   - `src/app/page.tsx`, application shell, Header
   - `src/server/auth/`, `proxy.ts`
   - auth and authorization tests

4. **Database/schema changes:**
   - Apply only Better Auth-generated follow-up changes if the final configuration differs from Phase 1.
   - Do not add roles, organizations, profiles, or admin tables.
   - Keep domain ownership FKs tied to Better Auth’s canonical user ID.

5. **Dependencies:** Phase 1 migration foundation; `BETTER_AUTH_SECRET`, canonical application URL, and two normalized allowed email addresses.

6. **Implementation substeps:**
   - Configure Better Auth email/password with trusted origins and secure production cookies.
   - Reject sign-up server-side unless the normalized email appears in `BETTER_AUTH_ALLOWED_EMAILS`.
   - Mount the official Next.js handler.
   - Add minimal sign-in/sign-up forms using existing visual primitives; do not redesign the application.
   - Refactor the root page to retrieve the full server session and redirect unauthenticated users.
   - Add `proxy.ts` only as an early navigation redirect; never treat cookie presence as authorization. Better Auth explicitly requires authoritative page/action validation. [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
   - Implement `requireUser()` through `auth.api.getSession({ headers })`.
   - Centralize authentication failures as `UNAUTHENTICATED`; ownership failures should return `NOT_FOUND` to avoid object enumeration.
   - Update Header to render the authenticated name and sign-out action.
   - Add test helpers for two independent users.

7. **Acceptance criteria:**
   - Non-allowlisted registration fails on the server.
   - Each allowed user can register, sign in, refresh, and sign out.
   - Unauthenticated navigation redirects to sign-in.
   - Forged IDs or cookies cannot authorize a private action.
   - Every future private query/action has one required trusted-user entry point.
   - Existing frontend layout remains unchanged after login.

8. **Tests/verifications:**
   - Unit tests for allowlist normalization and rejection.
   - Route tests for registration, sign-in, session retrieval, and sign-out.
   - Browser test for protected navigation and session persistence.
   - Two-user tests proving one user cannot read/update/delete the other user’s seeded row.
   - Production-cookie configuration test.
   - Build, lint, typecheck, and `git diff --check`.

9. **Security/data ownership concerns:**
   - Never accept `userId` in action schemas.
   - Keep allowlist and Better Auth secret server-only.
   - Set trusted origins explicitly for localhost, Vercel preview if used, and production.
   - Use generic sign-in errors to avoid leaking account existence.
   - Apply rate protections available within Better Auth; do not add a separate rate-limit service.
   - Mutation ownership must be part of the SQL predicate or verified in the same transaction.

10. **Risks or negotiable decisions:**
    - Email verification and password reset require an email delivery service and remain out of scope.
    - Account recovery is therefore manual for v1.
    - Registration may later be disabled after both accounts exist, but the approved default is a permanent server-side two-email allowlist.
    - No social login, passkeys, organizations, or 2FA in this plan.

11. **Recommended commit boundaries:**
    - `feat: configure Better Auth with allowlisted registration`
    - `feat: add authentication screens and protected app shell`
    - `security: enforce server sessions and ownership helpers`
    - `test: add two-user authorization coverage`

---

## Phase 3 — Exercise Library + Split Persistence

### Subphases

- **3A — built-in exercise seed and read adapters**
- **3B — split queries and mutations**
- **3C — connect the existing Split UI**

1. **Goal:** Replace exercise/split fixtures with persistent user-owned split data while preserving the current editor.

2. **Deliverables:**
   - Idempotent seed for the nine approved built-in exercises.
   - Real exercise-library and split queries.
   - Create, rename, delete, and reorder split days.
   - Add, remove, reorder, and edit split exercises, targets, and notes.
   - Existing `SplitDay`/`SplitExercise` view models populated from Drizzle.

3. **Likely files/areas affected:**
   - database seed scripts
   - `src/server/queries/exercises.ts`, `split.ts`
   - `src/actions/split.ts`, split validation and mappers
   - `SplitView.tsx`, page/application-shell initial data
   - `src/types/exercise.ts`, `split.ts`

4. **Database/schema changes:**
   - No new tables expected.
   - Add a corrective migration only if Phase 1 testing reveals missing indexes/constraints.
   - Seed built-ins by stable database IDs or a unique immutable slug; never match updates solely by display name.

5. **Dependencies:** Phases 1–2.

6. **Implementation substeps:**
   - Seed only the built-ins represented by the approved fixture.
   - Define library visibility as built-ins plus the current user’s future custom exercises; custom creation remains disabled.
   - Implement `getExercises()` and `getSplitDays()` as server-only reads.
   - Implement actions: `createSplitDay`, `renameSplitDay`, `deleteSplitDay`, `reorderSplitDays`, `addSplitExercise`, `removeSplitExercise`, `reorderSplitExercises`, and `updateSplitExercise`.
   - Validate names, IDs, order lists, set counts, rep ranges, and notes.
   - Run reorder operations transactionally and normalize sort order.
   - Scope child mutations by joining through the user-owned split day.
   - Convert the current client-only callbacks to async actions with pending/error states and local optimistic updates only after validation.
   - Remove split/exercise mock imports once the real path is complete.

7. **Acceptance criteria:**
   - Each user sees the shared exercise library but only their own split.
   - All plan-required split edits persist across refresh and login.
   - Reorders remain gapless and stable.
   - Invalid rep ranges and duplicate/replayed IDs fail cleanly.
   - Deleting or renaming a split cannot affect the other user.
   - Existing layout and controls retain their visual treatment.

8. **Tests/verifications:**
   - Seed idempotency.
   - Validation tests for names, sets, and rep ranges.
   - Query tests for empty, populated, and ordered splits.
   - Mutation tests for every edit and reorder.
   - Concurrent/stale reorder rejection or deterministic last-write behavior.
   - Cross-user read/mutation denial.
   - Mobile browser pass through all split editor operations.

9. **Security/data ownership concerns:**
   - Verify exercise IDs refer to visible built-ins or the user’s own future custom exercise.
   - Never mutate a split exercise using its ID alone; include owner resolution.
   - Use transactions for reorder and multi-row delete operations.
   - Bound names and notes to prevent oversized storage and UI abuse.

10. **Risks or negotiable decisions:**
    - Custom exercise creation remains explicitly deferred.
    - Deleting a split day is allowed, but future completed workout snapshots remain intact.
    - Confirmation treatment should reuse the current UI; no new modal design system.
    - Recommended bounds: 50 split days, 50 exercises per day, 20 target sets, 100 reps, and 1,000-character notes.

11. **Recommended commit boundaries:**
    - `feat: seed and query built-in exercises`
    - `feat: add user-owned split actions`
    - `feat: connect split editor to persistent data`
    - `test: cover split ordering and ownership`

---

## Phase 4 — Workout Logging

### Subphases

- **4A — start/resume/discard lifecycle**
- **4B — draft set persistence**
- **4C — atomic completion and snapshot verification**
- **4D — connect Train UI**

1. **Goal:** Make the Train screen a resumable, persistent workout logger with correct historical snapshots.

2. **Deliverables:**
   - One active workout per user.
   - Start, resume, save, discard, and complete actions.
   - Editable/addable/removable draft sets.
   - Snapshot of split-day and exercise targets at start time.
   - Server-derived duration and concurrency protection.

3. **Likely files/areas affected:**
   - `src/server/queries/workouts.ts`
   - `src/actions/workouts.ts`
   - workout validation/mappers/types
   - `TrainView.tsx`, `SetEntry.tsx`
   - workout transaction tests

4. **Database/schema changes:**
   - Use the Phase 1 session tables.
   - Add a migration only if optimistic locking or snapshot coverage was omitted.
   - Required snapshot fields: workout-day name, exercise name, exercise order, target sets, rep range, and split-exercise notes.
   - `version` increments on each draft save.
   - Partial unique index enforces one active session per user.

5. **Dependencies:** Phase 3 persisted split.

6. **Implementation substeps:**
   - Implement `getActiveWorkout()`.
   - Implement `startWorkout(splitDayId)` as a transaction that verifies ownership and snapshots the current split.
   - If an active session exists, return it instead of creating a second one.
   - Initialize draft set slots from target set count and previous performance, but keep `isCompleted=false`.
   - Keep current editing local while typing; persist the complete draft through `saveWorkoutDraft`.
   - Add/remove sets by stable set IDs and normalize set numbers.
   - Require the client’s current session `version`; reject stale saves as `CONFLICT`.
   - Implement `discardWorkout` for the owner’s active session only.
   - Implement `completeWorkout` transactionally: validate ownership/version, retain only completed sets, require at least one completed set, update notes, set `completed_at`, and close the draft.
   - Calculate duration from `started_at` and `completed_at`; remove the mocked 45-minute value.
   - Do not invoke progression or Groq inside the completion transaction.
   - Connect existing completion progress, save, and finish controls to pending/success/error states.
   - Resume the active draft after reload or sign-in.

7. **Acceptance criteria:**
   - Starting a workout persists a snapshot and survives refresh.
   - A user cannot create two active sessions.
   - Weight/reps, completion toggles, added/removed sets, and notes persist after Save.
   - Completion is atomic and produces one immutable historical session.
   - Later split edits/deletion do not rewrite completed history.
   - Uncompleted placeholder sets do not enter historical calculations.
   - Stale-tab saves are rejected rather than silently overwriting newer data.

8. **Tests/verifications:**
   - Lifecycle state-machine tests.
   - One-active-session database constraint test.
   - Draft save/reload and stale-version tests.
   - Atomic rollback test for invalid completion.
   - Snapshot preservation after split rename, target edit, exercise reorder, and deletion.
   - Cross-user start/save/discard/complete attempts.
   - Mobile test for numeric entry, add/remove set, save, resume, and complete.
   - Interrupted request/retry test proving no duplicate completed session.

9. **Security/data ownership concerns:**
   - Resolve session ownership inside every query and transaction.
   - Ignore client-supplied names, owner IDs, timestamps, duration, or snapshots.
   - Load snapshot source data server-side from the owned split.
   - Bound set counts and numeric values; reject `NaN`, infinities, negative weights, and invalid reps.
   - Do not expose another user’s active-session existence through differentiated errors.

10. **Risks or negotiable decisions:**
    - Approved default: one active session per user.
    - Draft saves are explicit, not per-keystroke autosaves, to avoid chatty writes.
    - Completed history is read-only in v1; “edit saved set” means editing a saved active draft before completion.
    - Recommended validation bounds: 0–1,500 kg, 1–1,000 reps, and 30 sets per exercise.

11. **Recommended commit boundaries:**
    - `feat: add active workout lifecycle`
    - `feat: persist resumable workout drafts`
    - `feat: complete workouts with historical snapshots`
    - `feat: connect Train screen to workout actions`
    - `test: cover workout transactions and stale drafts`

---

## Phase 5 — Previous Performance + History

1. **Goal:** Replace workout-history fixtures and show reliable prior performance while training.

2. **Deliverables:**
   - Paginated completed-session history.
   - Completed-session detail DTOs.
   - Per-exercise history.
   - Latest previous completed performance for each active exercise.
   - Existing History and Exercise Detail screens backed by real data.

3. **Likely files/areas affected:**
   - `src/server/queries/history.ts`
   - history mappers/types
   - `HistoryView.tsx`, `ExerciseDetailView.tsx`, `TrainView.tsx`
   - page/application-shell data loading

4. **Database/schema changes:** None expected; add indexes only if query plans show missing `(user_id, completed_at)` or exercise-history coverage.

5. **Dependencies:** Phase 4 completed sessions.

6. **Implementation substeps:**
   - Query only `status='completed'` sessions ordered by completion time descending.
   - Paginate workout history with a stable cursor and a default page size of 20.
   - Load session detail by session ID plus owner.
   - Build exercise history from completed sets ordered chronologically.
   - Define previous performance as the latest completed session exercise before the active session’s `started_at`.
   - Exclude discarded drafts, uncompleted sets, and the current active session.
   - Map snapshots to the existing `CompletedSession` and `SessionExerciseLog` shapes.
   - Remove workout-history mock access.

7. **Acceptance criteria:**
   - History persists across sessions and logins.
   - Empty history renders the approved empty state.
   - Previous performance is immediately visible during training.
   - Exercise history matches completed session facts exactly.
   - Split changes do not alter historical names or targets.
   - User A never receives User B’s history.

8. **Tests/verifications:**
   - Ordering and pagination tests.
   - Previous-performance selection with several sessions.
   - Exclusion tests for drafts/uncompleted sets.
   - Snapshot-integrity tests.
   - Cross-user enumeration tests.
   - Browser checks for collapsed/expanded history and exercise selection.

9. **Security/data ownership concerns:**
   - Scope the outer session query before joining children.
   - Return `NOT_FOUND` for foreign session/exercise-history requests.
   - Cap page size and validate cursor/IDs.
   - Never construct an unrestricted child query from client IDs.

10. **Risks or negotiable decisions:**
    - Full-text search and date filtering are out of scope.
    - History editing remains out of scope.
    - Cursor pagination is retained even for two users because workout history grows indefinitely.

11. **Recommended commit boundaries:**
    - `feat: add completed workout history queries`
    - `feat: add exercise and previous-performance history`
    - `feat: connect history screens to real sessions`
    - `test: verify history ownership and snapshots`

---

## Phase 6 — Deterministic Progression Engine

### Subphases

- **6A — normalized workout facts and formulas**
- **6B — PR derivation**
- **6C — progression classification**
- **6D — exhaustive fixtures and boundary tests**

1. **Goal:** Produce explainable, pure, deterministic training facts before any AI call.

2. **Deliverables:**
   - Epley estimated 1RM.
   - Session metrics and chart points.
   - Four PR types: highest load, reps-at-load, estimated 1RM, and session volume.
   - Rep/load/volume/e1RM changes and recent trends.
   - Six deterministic progression statuses with evidence.

3. **Likely files/areas affected:**
   - `src/lib/progression/*`
   - `src/types/progression.ts`
   - progression/history query adapters
   - table-driven unit fixtures and property/boundary tests

4. **Database/schema changes:** None. PRs and progression remain derived from completed workout history; no PR or progression-state tables.

5. **Dependencies:** Phase 5 reliable history.

6. **Implementation substeps:**
   - Normalize completed session exercises into chronological facts.
   - Treat the first `targetSets` completed sets as comparable planned work; retain all completed sets for full session-volume PRs.
   - Define `workingLoad` as the most frequent planned-set load, breaking ties toward the higher load.
   - Calculate:
     - total planned reps
     - planned volume
     - full session volume
     - maximum load
     - maximum reps at each exact load
     - best-set Epley estimate
     - deltas against the previous completed session
     - a four-session direction using first-to-latest change, not a fabricated score
   - Derive PR achievements by comparing each historical fact only with earlier facts.
   - Apply status precedence:
     1. `INSUFFICIENT_DATA`: fewer than two completed sessions.
     2. `READY_TO_INCREASE_LOAD`: latest session has at least the planned set count, all planned sets use the working load, and all meet/exceed the target maximum.
     3. `ADAPTING_TO_NEW_LOAD`: working load increased and every planned set remains at/above target minimum.
     4. `REGRESSING`: at the same/lower working load both planned reps and best e1RM decline, or a new load causes below-minimum reps without an e1RM improvement.
     5. `PROGRESSING`: no regression condition and at least one of working load, planned reps at comparable load, planned volume, or best e1RM improves.
     6. `STALLED`: two comparable sessions remain without an objective improvement after the prior rules.
   - Return evidence fields explaining which facts triggered the status.
   - Keep AI predictions outside chart/history point types.

7. **Acceptance criteria:**
   - Identical history always produces identical output.
   - Changing unrelated user/profile data cannot change objective status.
   - Added extra sets can affect session-volume PRs but cannot falsely satisfy planned-set readiness.
   - Estimated 1RM is labelled as estimated.
   - Every status result includes machine-readable metrics and a concise deterministic explanation.
   - No derived result is written as source-of-truth data.

8. **Tests/verifications:**
   - Epley cases: zero/invalid, one rep, fractional weight, rounding.
   - Table-driven status fixture for every state.
   - Mixed-load, missing-set, extra-set, target-change, tie, and regression cases.
   - PR chronology tests proving no future leakage.
   - Recalculation after corrected fixture history.
   - Determinism test with repeated and reordered input.
   - Full test suite, typecheck, lint, build, and mutation-review of branch precedence.

9. **Security/data ownership concerns:**
   - The pure engine receives already user-scoped facts.
   - Never allow callers to submit arbitrary history for authoritative server analysis.
   - Keep raw user notes out of deterministic calculations.
   - Limit per-request history loads sensibly while ensuring PR calculations still see the full owned history.

10. **Risks or negotiable decisions:**
    - Status thresholds are deliberately understandable v1 rules, not medical or coaching claims.
    - The initial stall rule uses two comparable sessions; it can later be tightened without schema changes.
    - Epley is the sole v1 estimate.
    - Correctness review should focus on classification precedence before UI integration.

11. **Recommended commit boundaries:**
    - `feat: add deterministic workout metrics`
    - `feat: derive personal records from workout history`
    - `feat: classify deterministic progression states`
    - `test: add exhaustive progression fixtures`

---

## Phase 7 — Connect Progression UI

1. **Goal:** Replace mock PR, progression, and graph inputs with Phase 6 facts without changing the approved screen design.

2. **Deliverables:**
   - Real exercise progression points.
   - Real current PRs and achieved-PR feed.
   - Real status badges, metrics, and deterministic explanations.
   - Recorded-data-only Recharts series.
   - Honest insufficient/error states before AI exists.

3. **Likely files/areas affected:**
   - progression server queries/actions and mappers
   - `ExerciseDetailView.tsx`, `RuneBadge.tsx`
   - `src/types/progression.ts`
   - progression fixture imports in `dataService`

4. **Database/schema changes:** None.

5. **Dependencies:** Phase 6.

6. **Implementation substeps:**
   - Implement `getExerciseProgression(exerciseId)` and `getRecentPRs()`.
   - Fetch only user-owned completed history.
   - Preserve current Recharts presentation while replacing fixture series.
   - Keep recorded chart points separate from future predicted points.
   - Replace mock AI panels with deterministic facts plus an “AI guidance unavailable/not generated” state until Phase 8.
   - Add pending, empty, and error rendering through existing UI components.
   - Remove progression and PR mock imports.

7. **Acceptance criteria:**
   - UI metrics match direct calculations from the user’s completed sets.
   - Exercise switching cannot show stale data from the prior exercise.
   - Prediction styling never appears for recorded facts or vice versa.
   - Insufficient data shows the correct state.
   - No fake AI guidance remains on connected screens.

8. **Tests/verifications:**
   - Mapper/component tests for every progression status.
   - Recharts input tests for recorded points and empty history.
   - Race test for rapid exercise selection.
   - Browser comparison against known seeded histories.
   - Cross-user query test.
   - Mobile and desktop visual regression check.

9. **Security/data ownership concerns:**
   - Exercise selection is untrusted; resolve visibility and owned history server-side.
   - Do not return raw history belonging to another user through chart endpoints.
   - Escape/render explanations as text, never HTML.

10. **Risks or negotiable decisions:**
    - Existing Progress UI combines exercise facts and AI presentation; retain the layout but show deterministic-only content until Phase 8.
    - No new chart types beyond weight and estimated 1RM unless an existing approved section already accommodates reps/volume.

11. **Recommended commit boundaries:**
    - `feat: add progression read models`
    - `feat: connect exercise progress and PR UI`
    - `test: verify progression rendering and request races`

---

## Phase 8 — Groq AI Layer

### Subphases

- **8A — training profile and bounded context builder**
- **8B — Groq structured-output client and cache**
- **8C — fallback behavior and UI integration**

1. **Goal:** Add concise AI guidance that interprets deterministic facts without becoming a source of truth or availability dependency.

2. **Deliverables:**
   - User training profile persistence.
   - Bounded, structured exercise context.
   - Strict JSON-schema Groq request where supported.
   - Zod validation of every response.
   - Context-hash cache and graceful failure contract.
   - Real guidance/probable-next-PR display.

3. **Likely files/areas affected:**
   - `src/db/schema/training-profile.ts`, AI-cache schema/migration
   - `src/lib/groq.ts`, `src/lib/ai/context.ts`, AI schemas
   - `src/actions/ai.ts`
   - `ExerciseDetailView.tsx`, `AnalyticsView.tsx`
   - AI contract tests

4. **Database/schema changes:**
   - `training_profiles`: one row per user; nullable experience, goal, preferred method, validated `available_weight_increments` JSON, notes, timestamps.
   - `ai_guidance_cache`: user, exercise, deterministic context hash, validated response JSON, model, creation/update timestamps.
   - Keep only the latest cache row per user/exercise; this is a cache, not history or fact storage.

5. **Dependencies:** Phases 6–7; Groq API key and a selected currently supported structured-output model.

6. **Implementation substeps:**
   - Add profile read/update action with Zod validation.
   - Build context from the owned exercise, current target snapshot, recent bounded history, deterministic metrics/status, current PR, and relevant profile fields.
   - Do not send the user’s entire database.
   - Delimit user-authored notes as data and instruct the model not to treat them as commands.
   - Define AI output without an authoritative status field:
     - `nextWeight`
     - `targetRepMin`
     - `targetRepMax`
     - `probableNextPR`
     - `guidance`
     - `reasoning`
     - `confidence`
   - Use Groq strict structured output when the pinned model supports it; strict schemas require required fields and `additionalProperties: false`. Still validate with Zod at runtime. [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)
   - Hash canonical structured context. Return a validated cached result when the hash matches.
   - On cache miss, make one bounded Groq call; validate and persist only a valid result.
   - On timeout, API error, refusal, malformed output, or rate limit, return deterministic data plus `aiAvailability='unavailable'`; never fabricate replacement guidance.
   - Add an explicit retry/refresh control using the existing component style.
   - Analytics remains deterministic; cached AI guidance is optional supporting text only.

7. **Acceptance criteria:**
   - Groq receives server-loaded, user-owned, structured facts.
   - Model output cannot override progression status or recorded PRs.
   - Invalid responses never reach UI or cache.
   - Repeated identical contexts use cache and avoid another call.
   - Changed workout history invalidates the context hash.
   - The app remains fully usable when Groq is disabled or failing.
   - Predictions are labelled as predictions.

8. **Tests/verifications:**
   - Zod request/response contract tests.
   - Context minimization and deterministic-hash tests.
   - Prompt-injection fixture through profile/session notes.
   - Mocked success, timeout, 4xx, 5xx, refusal, malformed JSON, schema mismatch, and cache-hit tests.
   - Assert no Groq key enters client bundles.
   - Live Groq smoke test only when explicitly enabled by environment.
   - Browser check of available, cached, insufficient-data, and unavailable states.

9. **Security/data ownership concerns:**
   - Derive user and exercise history server-side.
   - Never accept client-supplied deterministic metrics.
   - Keep Groq key server-only and redact provider errors.
   - Bound prompt size and output tokens.
   - Avoid including email, auth records, photo data, or unrelated exercise history.
   - Treat AI output as untrusted text even after schema validation.

10. **Risks or negotiable decisions:**
    - The exact Groq model must be revalidated at Phase 8 because structured-output support changes.
    - No background generation, queue, or batch generation.
    - No AI response history beyond the latest context cache.
    - Probable-next-PR is absent when AI is unavailable; deterministic status and facts still render.
    - Training-profile editing can use a minimal existing-style panel; no settings redesign.

11. **Recommended commit boundaries:**
    - `feat: persist AI training profiles`
    - `feat: build bounded deterministic AI context`
    - `feat: add validated Groq guidance and caching`
    - `feat: connect AI availability states to progress UI`
    - `test: cover Groq failures and context isolation`

---

## Phase 9 — Analytics

1. **Goal:** Replace placeholder dashboard analytics with concise aggregates derived from actual history and progression results.

2. **Deliverables:**
   - Counts for progressing, stalled/regressing, ready-to-increase, and insufficient-data exercises.
   - Recent PR feed.
   - Strongest recent improvements and strength trends.
   - Optional bodyweight trend only after Phase 10.
   - Existing analytics layout connected to real values.

3. **Likely files/areas affected:**
   - `src/lib/analytics/*`, analytics queries/mappers
   - `AnalyticsView.tsx`
   - analytics tests

4. **Database/schema changes:** None; no analytics cache initially.

5. **Dependencies:** Phases 6–8.

6. **Implementation substeps:**
   - Calculate one current progression result per exercise with completed history.
   - Aggregate statuses without inventing a composite score.
   - Define “recent PR” using the achievement date and a fixed recent window exposed in the DTO.
   - Rank strongest improvements by explicit e1RM/load/rep change, displaying the metric rather than a score.
   - Use deterministic facts for all grouping and counts.
   - Render cached AI guidance only as optional explanation.
   - Add bodyweight summary after Phase 10 without changing the analytics contract shape.

7. **Acceptance criteria:**
   - Every dashboard number can be traced to owned completed sessions.
   - Totals reconcile with exercise-level status results.
   - Empty and insufficient histories render honestly.
   - No fake score, gamification, or mock insight remains.
   - Groq failure does not alter analytics counts.

8. **Tests/verifications:**
   - Aggregate fixtures covering every status.
   - Recent-window boundary tests.
   - Ranking/tie tests.
   - Cross-user isolation.
   - UI empty/loading/error tests.
   - Browser comparison against known database fixtures.

9. **Security/data ownership concerns:**
   - Aggregate only after loading user-scoped facts.
   - Do not leak exercise names or counts from another user.
   - Keep bounded result sizes.

10. **Risks or negotiable decisions:**
    - Recommended “recent” window is 30 days.
    - Strongest improvement ranking remains metric-specific; no combined fitness score.
    - No precomputed/materialized analytics until measured performance requires it.

11. **Recommended commit boundaries:**
    - `feat: derive user-owned analytics summaries`
    - `feat: connect analytics dashboard to real data`
    - `test: verify analytics reconciliation and isolation`

---

## Phase 10 — Bodyweight

1. **Goal:** Persist bodyweight entries and replace local-only chart/stat calculations with user-owned data.

2. **Deliverables:**
   - Add/update same-day and delete bodyweight actions.
   - Ordered bodyweight history.
   - Current, starting, net change, and recent trend.
   - Real Recharts series in the existing screen.

3. **Likely files/areas affected:**
   - bodyweight schema/migration
   - `src/server/queries/bodyweight.ts`, `src/actions/bodyweight.ts`
   - validation/mappers/types
   - `BodyweightView.tsx`

4. **Database/schema changes:**
   - `bodyweight_logs`: ID, user, calendar date, exact numeric weight, timestamps.
   - Unique `(user_id, date)`; logging the same date updates that user’s entry.
   - Index `(user_id, date)`.

5. **Dependencies:** Phase 2; Phase 9 can consume the completed summary afterward.

6. **Implementation substeps:**
   - Add migration and Drizzle schema.
   - Implement `getBodyweightLogs`, `logBodyweight`, and `deleteBodyweightEntry`.
   - Validate date and 20–500 kg default bounds.
   - Sort server results oldest-to-newest for graphs.
   - Calculate starting/current/net from facts.
   - Define recent trend as latest minus earliest among the most recent four entries; return insufficient with fewer than two.
   - Connect existing modal and chart to actions and pending/error states.
   - Add bodyweight summary to analytics.
   - Remove bodyweight fixture imports.

7. **Acceptance criteria:**
   - Logs persist by account and refresh correctly.
   - Same-day logging updates rather than duplicates.
   - Stats and graph match stored entries.
   - Empty/one-entry states are correct.
   - No body measurements are introduced.

8. **Tests/verifications:**
   - Validation and same-day upsert tests.
   - Chronological ordering and statistic tests.
   - Cross-user update/delete denial.
   - Chart input tests.
   - Mobile numeric-entry browser check.

9. **Security/data ownership concerns:**
   - Scope upserts and deletes to session user.
   - Do not accept owner ID.
   - Use exact numeric storage and validated DTO conversion.
   - Return `NOT_FOUND` for foreign IDs.

10. **Risks or negotiable decisions:**
    - No moving average in v1.
    - One entry per calendar date is the approved default.
    - Dates use the user-entered/local date rather than deriving a date from UTC server time.

11. **Recommended commit boundaries:**
    - `feat: add user-owned bodyweight storage`
    - `feat: connect bodyweight screen and analytics`
    - `test: verify bodyweight calculations and ownership`

---

## Phase 11 — Cloudflare R2 + Progress Photos

### Subphases

- **11A — private bucket client, CORS, and metadata schema**
- **11B — client compression and presigned upload/confirmation**
- **11C — private reads, gallery, tags, deletion**
- **11D — side-by-side comparison and failure cleanup**

1. **Goal:** Replace photo placeholders with securely uploaded private images while retaining the approved gallery/comparison interface.

2. **Deliverables:**
   - Private R2 bucket integration.
   - Short-lived presigned PUT and GET URLs.
   - Browser-side resize/compression.
   - Metadata confirmation after upload.
   - Gallery filtering, five supported tags, deletion, and comparison.
   - Idempotent failure handling.

3. **Likely files/areas affected:**
   - photo schema/migration
   - `src/lib/r2.ts`, photo actions/route handlers
   - upload compression helper and validation
   - `PhotosView.tsx`, photo types
   - R2 contract tests

4. **Database/schema changes:**
   - `progress_photos`: ID, user, storage key, date, nullable tag, notes, MIME type, byte size, width, height, timestamps.
   - Tag constraint: `front | side | back | relaxed | flexed`.
   - Unique storage key and `(user_id, date)` index.
   - PostgreSQL stores metadata only.

5. **Dependencies:** Phase 2; R2 bucket, scoped API credentials, and CORS configuration.

6. **Implementation substeps:**
   - Create a private bucket and server-only S3-compatible client.
   - Configure CORS for exact development/preview/production origins and only required methods/headers. Browser presigned operations fail without bucket CORS. [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
   - Implement authenticated `POST /api/photos/presign` that validates metadata and creates an unguessable `users/{authenticatedUserId}/{uuid}` key.
   - Bind the short-lived PUT signature to the key and exact content type.
   - Resize locally to a maximum 1,600-pixel long edge, encode WebP at approximately 0.82 quality, and require output no larger than 3 MB.
   - PUT directly to R2; never send image bytes through Next.js.
   - Confirm upload through an authenticated action that performs `HEAD`, verifies key prefix/type/size, then inserts metadata.
   - Delete invalid/oversized uploads before returning failure.
   - List only owned metadata and issue short-lived GET URLs after ownership checks.
   - Implement idempotent delete: verify metadata ownership, delete object, then delete metadata; retries must tolerate an already-missing object.
   - Replace silhouettes with real images while preserving gallery, filters, and comparison layout.
   - Treat presigned URLs as bearer credentials and keep expirations short. [Cloudflare R2 presigned URL guidance](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

7. **Acceptance criteria:**
   - Users upload directly to private R2 and see confirmed photos in their gallery.
   - Unconfirmed or invalid uploads never create visible metadata.
   - User A cannot presign, view, confirm, or delete User B’s object.
   - Expired URLs stop working.
   - Tag filtering and two-photo comparison work with real images.
   - Failed upload/delete states are recoverable and do not corrupt metadata.
   - R2 credentials never reach the browser.

8. **Tests/verifications:**
   - Validation tests for type, size, dimensions, tag, date, and notes.
   - Presign tests proving authenticated key prefix and expiry.
   - Mocked R2 PUT/HEAD/GET/delete success and failure tests.
   - Cross-user object enumeration tests.
   - Upload-confirm replay/idempotency tests.
   - Browser CORS test against a non-production bucket.
   - iPhone-sized image compression, orientation, upload, gallery, and comparison tests.
   - Client bundle secret scan.

9. **Security/data ownership concerns:**
   - Private bucket only; no public development shortcut.
   - Use separate scoped R2 credentials with access limited to the photo bucket.
   - Never accept arbitrary object keys during confirm/delete.
   - Validate after upload because a PUT presign alone cannot be trusted as metadata proof.
   - Escape notes and avoid using original filenames as keys.
   - Configure `img-src` only for the necessary R2 S3 endpoint.

10. **Risks or negotiable decisions:**
    - HEIC behavior must be verified on target iPhones before locking accepted source formats; JPEG/PNG/WebP are mandatory.
    - Recommended limits are 20 MB source input, 3 MB stored output, and 1,600-pixel long edge.
    - Client-side Canvas/Web APIs are preferred; add a compression library only if orientation/HEIC testing proves the native path insufficient.
    - No CDN/public custom domain, albums, sharing, or image transformations service.

11. **Recommended commit boundaries:**
    - `feat: add private R2 photo metadata and client`
    - `feat: add presigned upload and confirmation flow`
    - `feat: connect private gallery and deletion`
    - `feat: connect real photo comparison`
    - `test: cover R2 ownership and upload failures`

---

## Phase 12 — Remove Remaining Mock Data

1. **Goal:** Eliminate hybrid mock/real behavior after every screen has a real source.

2. **Deliverables:**
   - Remove obsolete fixtures and synchronous mock service methods.
   - Remove fake AI, placeholder analytics, mock persistence, and silhouette-only code.
   - Ensure every visible datum is real, derived, empty, unavailable, or explicitly predicted.

3. **Likely files/areas affected:**
   - `src/data/mock/*`, `src/services/dataService.ts`
   - screen imports and backward-compatibility aliases
   - obsolete comments, labels, and README text

4. **Database/schema changes:** None.

5. **Dependencies:** Phases 3–11.

6. **Implementation substeps:**
   - Inventory every mock import and hard-coded sample value.
   - Trace each existing getter to its real replacement.
   - Remove fixtures only after the corresponding screen tests pass.
   - Remove default `50 kg`, fixed duration, mock cycle/user, fake PRs, fake guidance, and demo-only persistence.
   - Remove compatibility aliases that no longer serve a real consumer.
   - Update empty/loading/error states where fixture removal exposes missing data.
   - Search production code for mock/demo/placeholder markers.

7. **Acceptance criteria:**
   - No production import references `src/data/mock`.
   - Fresh users see honest empty states.
   - Existing users see only their own persisted facts.
   - Groq outage never causes sample guidance to appear.
   - No `v1.0-MOCK` or equivalent demo label remains.

8. **Tests/verifications:**
   - `rg` audit for mock/demo/placeholder identifiers.
   - Fresh-account end-to-end test.
   - Populated-account end-to-end test.
   - Groq-disabled and R2-disabled failure-state tests.
   - Full tests, lint, typecheck, build, and `git diff --check`.

9. **Security/data ownership concerns:**
   - Ensure fixtures are not used as fallbacks that bypass authorization.
   - Confirm error handling does not reveal another user’s data.
   - Remove any development credentials or sample secrets.

10. **Risks or negotiable decisions:**
    - Keep test-only factories under test directories; remove only production fixtures.
    - No migration of current in-memory sample history into real accounts unless explicitly requested later.

11. **Recommended commit boundaries:**
    - `refactor: remove replaced mock data adapters`
    - `refactor: remove fake AI and analytics fallbacks`
    - `test: verify empty and populated real-data flows`

---

## Phase 13 — PWA + Production Hardening

### Subphases

- **13A — PWA manifest and installability**
- **13B — validation, security, mobile, and failure-state audit**
- **13C — Vercel/Neon/R2 production rollout**

1. **Goal:** Make the completed application installable, secure, observable through existing platform logs, and safe to deploy.

2. **Deliverables:**
   - App Router manifest, icons, theme metadata, and minimal service worker.
   - No offline synchronization; authenticated data remains network-authoritative.
   - Security headers and production environment validation.
   - End-to-end mobile and two-user isolation suite.
   - Vercel deployment and migration runbook.
   - Upload, AI, and database failure handling.

3. **Likely files/areas affected:**
   - `src/app/manifest.ts`, layout metadata, `public/`
   - minimal service worker registration
   - `next.config.ts`, `vercel.json` only if necessary
   - deployment/runbook documentation
   - Playwright configuration and end-to-end tests

4. **Database/schema changes:**
   - Only additive corrective migrations discovered during audit.
   - Never run schema push or destructive migration automatically during Vercel build.

5. **Dependencies:** Phases 1–12.

6. **Implementation substeps:**
   - Add manifest, 192/512 icons, maskable icon, standalone display, theme/background colors, and start URL using Next’s built-in App Router support. [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
   - Add a minimal service worker for static shell assets/offline fallback only; do not cache authenticated API responses, session data, presigned URLs, or workout mutations.
   - Add security headers: CSP, HSTS in production, `X-Content-Type-Options`, referrer policy, permissions policy, and frame protection.
   - Audit every action/route for auth → validation → owner-scoped query ordering.
   - Add request-size, note-length, set-count, history-page, Groq timeout/output, and photo limits.
   - Ensure server logs contain correlation context but no secrets, passwords, notes, presigned URLs, or Groq prompts.
   - Add Playwright flows for both accounts across split, workout, history, progression, bodyweight, and photos.
   - Test narrow iPhone viewport, Android viewport, desktop, touch targets, numeric inputs, reduced motion, keyboard access, loading, error, and retry states.
   - Configure Vercel environment separation and production trusted origins.
   - Apply reviewed migrations to production via an explicit release step using the direct URL before deploying application code that depends on them.
   - Verify Neon production branch, Better Auth URL/cookies, Groq model, R2 CORS, bucket privacy, and Vercel runtime logs.
   - Document rollback: application rollback first; schema rollback only through reviewed forward-fix migrations unless a safe explicit down migration exists.

7. **Acceptance criteria:**
   - Installable on supported iPhone/Android/desktop environments.
   - No authenticated mutation claims offline success.
   - All private routes/actions reject unauthenticated and foreign-user access.
   - Production build contains no secrets.
   - Migration from blank and previous schema succeeds.
   - Core workout loop works on real mobile hardware.
   - Groq/R2/Neon failures show recoverable states without data fabrication or partial completion.
   - Vercel production health is verified separately from local checks.

8. **Tests/verifications:**
   - Full unit/integration suite.
   - Playwright two-user E2E suite.
   - Migration replay on disposable Neon branch.
   - `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:check`.
   - PWA manifest/service-worker inspection and installability audit.
   - Security-header and CSP inspection.
   - Cross-user ID fuzzing for every entity.
   - R2 CORS/expiry/size tests.
   - Groq-disabled production-like smoke test.
   - `git diff --check`, clean status review, and deployment runbook rehearsal.

9. **Security/data ownership concerns:**
   - Do not cache personalized HTML/data in shared caches.
   - Exclude auth routes from service-worker caching.
   - Use environment-specific trusted origins and secure cookies.
   - Keep migration, R2, and Groq credentials server-only and least-privileged.
   - Never treat `proxy.ts` as the authorization boundary.
   - Confirm every delete/update includes ownership resolution.

10. **Risks or negotiable decisions:**
    - Service-worker behavior should remain minimal because offline workout synchronization is explicitly out of scope.
    - Preview deployments need a deliberate Neon branch and Better Auth trusted-origin policy; otherwise keep previews disconnected from production data.
    - No external monitoring service is added; use Vercel, Neon, R2, and Groq native logs/metrics.
    - Production migration and deployment remain explicit operator actions.

11. **Recommended commit boundaries:**
    - `feat: add installable PWA shell`
    - `security: harden routes headers and validation limits`
    - `test: add mobile and two-user end-to-end coverage`
    - `docs: add production migration and deployment runbook`
    - `chore: finalize Vercel production configuration`

---

## Final Recommended Phase Structure

1. Neon + Drizzle Foundation  
   - 1A pnpm/env  
   - 1B clients/schema  
   - 1C migration verification
2. Better Auth + User Isolation  
   - 2A auth/allowlist  
   - 2B UI/protection  
   - 2C ownership tests
3. Exercise Library + Split  
   - 3A exercise seed  
   - 3B split backend  
   - 3C UI connection
4. Workout Logging  
   - 4A lifecycle  
   - 4B drafts  
   - 4C completion/snapshots  
   - 4D UI connection
5. Previous Performance + History
6. Deterministic Progression Engine  
   - 6A facts/formulas  
   - 6B PRs  
   - 6C statuses  
   - 6D exhaustive tests
7. Connect Progression UI
8. Groq AI Layer  
   - 8A profile/context  
   - 8B structured client/cache  
   - 8C failure/UI integration
9. Analytics
10. Bodyweight
11. R2 + Progress Photos  
    - 11A storage/schema  
    - 11B upload/confirm  
    - 11C gallery/delete  
    - 11D comparison/failures
12. Remove Remaining Mock Data
13. PWA + Production Hardening  
    - 13A PWA  
    - 13B audit/E2E  
    - 13C production rollout

The main adaptation is that Phase 1 creates only the auth/core workout schema. Training-profile, bodyweight, AI-cache, and photo tables are added by their owning phases. This preserves dependency order while avoiding one giant speculative schema migration.

## Recommended Next Implementation Unit

**Phase 1A — pnpm, dependencies, and environment contract.**

It has a small review surface, creates no production data, and establishes the exact toolchain needed before schema work.

## Blockers or Decisions Required Before Phase 1

- Install pnpm: neither `pnpm` nor `corepack` is currently available.
- Provision or identify a Neon project with:
  - a disposable development/test branch
  - pooled runtime `DATABASE_URL`
  - direct `DIRECT_DATABASE_URL`
- Confirm credentials are placed only in untracked local/Vercel environment storage.
- No remaining product decision blocks Phase 1:
  - Authentication is locked to Better Auth email/password with a server-side two-email allowlist.
  - Workout persistence is locked to one resumable active session per user.
- Before Phase 2, supply the two normalized allowed email addresses and generate a strong Better Auth secret.
- Before Phase 8, choose and pin a currently available Groq model supporting the desired structured-output mode.
- Before Phase 11, provision the private R2 bucket and scoped credentials; HEIC behavior can be validated during 11B.
