# Phase 8 — Groq AI Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, concise per-exercise guidance and a probable-next-PR prediction to Exercise Detail View using Groq AI, adhering strictly to deterministic Phase 6 facts and user isolation boundaries.

**Architecture:** Server Action `getExerciseAiGuidance` loads owned history/splits/profile, executes Phase 6 server-side, builds a bounded SHA-256 context hash, checks `ai_guidance_cache`, and makes a single server-side Groq Chat Completions request with strict JSON schema on cache miss. Responses pass Zod and semantic validation before rendering in `ExerciseDetailView`.

**Tech Stack:** Next.js 16.3, React 19.2, TypeScript, Zod 4.4, Drizzle 0.45 (PostgreSQL), Neon, Node 24, pnpm 11, native `fetch` for Groq API.

## Global Constraints

- Recorded workout data determines what happened. Phase 6 determines PRs and progression. Groq may only recommend or predict what to try next.
- No Groq key or authorization header may reach client bundles, logs, or returned errors.
- Never write AI responses into workout, set, split, or deterministic tables.
- All actions require authenticated `requireUser()`. Client input is strictly parsed (e.g. `exerciseId` only).
- Provider failure, timeout (8s), rate limits (429), or missing key return safe `availability: 'unavailable'` without breaking deterministic UI.
- Update `SESSION_NOTES.md` after each material milestone as required by `RULES.md`.

---

### Task 8A.1 — Freeze AI contracts and validation

**Files:**
- Create: `src/types/ai.ts`
- Create: `src/lib/ai/schemas.ts`
- Modify: `src/types/index.ts`
- Create: `src/lib/ai/schemas.test.ts`

**Interfaces:**
- Consumes: `MAX_TARGET_REPS` from `@/server/validation/split`, `MAX_WORKOUT_REPS`, `MAX_WORKOUT_WEIGHT_KG` from `@/server/validation/workout`
- Produces: `AiRecommendation`, `aiRecommendationSchema`, `GROQ_AI_RECOMMENDATION_JSON_SCHEMA`, `ExerciseAiGuidance`, `AiUnavailableReason`, `TrainingProfileDTO`

- [ ] **Step 1: Write failing schema and type contract tests**

Create `src/lib/ai/schemas.test.ts` to test:
- `aiRecommendationSchema`: valid 5-field response passes; invalid/out-of-range weights/reps fail; `min > max` reps fails; `reasoning` > 280 chars fails; extra keys fail (`strict()`).
- `GROQ_AI_RECOMMENDATION_JSON_SCHEMA`: parity with Zod schema for required properties, types, and strict object bounds.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/lib/ai/schemas.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement types and Zod/JSON schemas**

Create `src/types/ai.ts` with `TrainingProfileDTO`, `ExerciseAiGuidance`, `AiUnavailableReason`, etc.
Create `src/lib/ai/schemas.ts` with `aiRecommendationSchema`, `GROQ_AI_RECOMMENDATION_JSON_SCHEMA`, `validateSemanticRecommendation`.
Modify `src/types/index.ts` to re-export `src/types/ai.ts`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/lib/ai/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 8A.1**

```bash
git add src/types/ai.ts src/types/index.ts src/lib/ai/schemas.ts src/lib/ai/schemas.test.ts
git commit -m "feat(ai): freeze AI contracts and Zod/JSON validation schemas"
```

---

### Task 8A.2 — Add profile/cache schema and migration

**Files:**
- Create: `src/db/schema/ai.ts`
- Modify: `src/db/schema/index.ts`
- Create: `drizzle/0001_*.sql` (generated via `pnpm db:generate`)
- Create: `src/db/schema/ai.test.ts`

**Interfaces:**
- Consumes: Drizzle pg table builders, `user` table from `@/db/schema/auth`, `exercises` table from `@/db/schema/workout`
- Produces: `trainingProfiles`, `aiGuidanceCache` table definitions and relations

- [ ] **Step 1: Write failing schema integrity test**

Create `src/db/schema/ai.test.ts` to assert that `trainingProfiles` and `aiGuidanceCache` export expected column names, primary keys, check constraints, and foreign key cascades.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/db/schema/ai.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Define schema and generate migration**

Create `src/db/schema/ai.ts` with `trainingProfiles` (user_id FK cascade PK, training_experience, primary_goal, preferred_progression_method, available_weight_increments_kg, general_training_notes, created_at, updated_at) and `aiGuidanceCache` (user_id FK cascade, exercise_id FK cascade, composite PK (user_id, exercise_id), context_hash, response_json, model, failure_code, last_attempt_at, retry_after, created_at, updated_at).
Re-export in `src/db/schema/index.ts`.
Run `pnpm db:generate` to generate the migration file `drizzle/0001_*.sql`.

- [ ] **Step 4: Run schema integrity and drizzle check**

Run: `pnpm test src/db/schema/ai.test.ts && pnpm exec drizzle-kit check`
Expected: PASS.

- [ ] **Step 5: Commit Task 8A.2**

```bash
git add src/db/schema/ai.ts src/db/schema/index.ts drizzle/ src/db/schema/ai.test.ts
git commit -m "feat(db): add training_profiles and ai_guidance_cache tables and migration"
```

---

### Task 8A.3 — Implement authenticated training-profile reads/updates

**Files:**
- Create: `src/server/validation/ai.ts`
- Create: `src/server/queries/ai.ts`
- Modify: `src/actions/ai.ts` (or create if new)
- Create: `src/server/queries/ai.test.ts`
- Create: `src/actions/ai.test.ts`
- Create: `src/components/screens/TrainingProfileForm.tsx`

**Interfaces:**
- Consumes: `requireUser()`, `db`, `trainingProfiles`
- Produces: `getTrainingProfile()`, `updateTrainingProfile(input)` Server Actions and `TrainingProfileForm` component

- [ ] **Step 1: Write failing profile query and action tests**

Create tests in `src/server/queries/ai.test.ts` and `src/actions/ai.test.ts` covering:
- Profile defaults when missing (returns null or empty DTO).
- Profile upsert on valid input.
- Input validation (increments max 50, notes max 1000, valid enums).
- Cross-user isolation (User A cannot read/update User B's profile).

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/server/queries/ai.test.ts src/actions/ai.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement validation, queries, server actions, and TrainingProfileForm UI**

Implement `src/server/validation/ai.ts` with Zod validation for training profile updates.
Implement `src/server/queries/ai.ts` with profile get/upsert functions.
Implement `src/actions/ai.ts` exporting `getTrainingProfile` and `updateTrainingProfile`.
Create `src/components/screens/TrainingProfileForm.tsx`.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test src/server/queries/ai.test.ts src/actions/ai.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 8A.3**

```bash
git add src/server/validation/ai.ts src/server/queries/ai.ts src/actions/ai.ts src/components/screens/TrainingProfileForm.tsx src/server/queries/ai.test.ts src/actions/ai.test.ts
git commit -m "feat(ai): implement training profile queries, actions, and form component"
```

---

### Task 8A.4 — Build bounded deterministic AI context

**Files:**
- Create: `src/server/ai/context.ts`
- Create: `src/server/ai/context.test.ts`

**Interfaces:**
- Consumes: `DerivedWorkoutFacts`, `DerivedPersonalRecords`, `DerivedProgressionAnalysis`, `SplitDay[]`, `TrainingProfileDTO`, `Exercise`
- Produces: `ExerciseAiContextV1`, `buildExerciseAiContext()`, `buildAiContextHash()`, `buildSourceHistoryHash()`

- [ ] **Step 1: Write failing context builder tests**

Create `src/server/ai/context.test.ts` testing:
- Context structure conforms to `ExerciseAiContextV1` (`schemaVersion: 1`).
- `recentSessions` slices the latest 6 facts.
- Sliced set IDs are omitted; ordinal labels or set numbers preserved.
- Untrusted notes are trimmed, bounded (300 code points for split notes, 1000 for profile notes), and normalized.
- SHA-256 hashes (`buildAiContextHash`, `buildSourceHistoryHash`) are deterministic and change when history/targets/profile change.
- User identity/email/auth tokens are completely absent from context.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/server/ai/context.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement context builder and hashing functions**

Create `src/server/ai/context.ts` with `import 'server-only'`, `AI_CONTEXT_SCHEMA_VERSION = 1`, `AI_RECENT_FACT_LIMIT = 6`, `buildExerciseAiContext`, `buildAiContextHash`, `buildSourceHistoryHash`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/server/ai/context.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 8A.4**

```bash
git add src/server/ai/context.ts src/server/ai/context.test.ts
git commit -m "feat(ai): add deterministic bounded AI context builder and SHA-256 hasher"
```

---

### Task 8B.1 — Add the server-only Groq client

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/server/ai/groq.ts`
- Create: `src/server/ai/groq.test.ts`

**Interfaces:**
- Consumes: `getAiEnv()`, `ExerciseAiContextV1`, `GROQ_AI_RECOMMENDATION_JSON_SCHEMA`
- Produces: `requestGroqAiRecommendation()` returning `Result<AiRecommendation, AiUnavailableReason>`

- [ ] **Step 1: Write failing Groq client tests with mocked fetch**

Create `src/server/ai/groq.test.ts` testing:
- Success path: 200 JSON strict output parsed by Zod and returned.
- Timeout (8s abort signal triggered) -> `timeout` (retryable).
- HTTP 429 -> `rate_limited` with parsed `Retry-After`.
- HTTP 401/403 -> `provider_error`.
- HTTP 500/503 -> `provider_error` (retryable).
- Malformed JSON / Zod schema mismatch -> `invalid_json` / `invalid_response`.
- Unconfigured API key -> `not_configured`.
- Redaction check: API key, Auth headers, sensitive note prompts NEVER appear in error messages or logs.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/server/ai/groq.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement env parser and Groq client**

Update `src/lib/env.ts` with `getAiEnv()` parsing `GROQ_API_KEY` and optional `GROQ_MODEL` (defaulting to `openai/gpt-oss-20b`).
Implement `src/server/ai/groq.ts` with `import 'server-only'`, 8s `AbortSignal.timeout`, strict structured JSON payload format, HTTP status mapping, Zod parsing, and redacted error handling.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/server/ai/groq.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 8B.1**

```bash
git add src/lib/env.ts src/server/ai/groq.ts src/server/ai/groq.test.ts
git commit -m "feat(ai): add server-only Groq HTTP client with strict JSON schema enforcement"
```

---

### Task 8B.2 — Add owned cache and guidance orchestration

**Files:**
- Modify: `src/server/queries/ai.ts`
- Create: `src/server/ai/guidance.ts`
- Modify: `src/actions/ai.ts`
- Create: `src/server/ai/guidance.test.ts`

**Interfaces:**
- Consumes: `requireUser()`, `getExerciseHistory()`, `getSplitDays()`, `getTrainingProfile()`, `requestGroqAiRecommendation()`, `aiGuidanceCache`
- Produces: `getExerciseAiGuidance({ exerciseId })` Server Action returning `ActionResult<ExerciseAiGuidance>`

- [ ] **Step 1: Write failing guidance orchestration tests**

Create `src/server/ai/guidance.test.ts` testing:
- Insufficient data (<2 completed sessions) returns `availability: 'insufficient_data'`.
- Exact cache hit returns `source: 'cache'` without calling Groq API.
- Cache miss calls Groq API, validates response, stores valid cache row, returns `source: 'groq'`.
- Negative attempt cooldown prevents hammering Groq on repeated requests during provider outage.
- Semantic validation failure (e.g. predicted PR lower than current record) returns `invalid_response` and is not cached.
- User isolation: User A cannot hit User B's cache entry.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/server/ai/guidance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement cache queries, guidance orchestration service, and Server Action**

Add cache get/upsert methods in `src/server/queries/ai.ts`.
Create `src/server/ai/guidance.ts` orchestrating history/split/profile load, Phase 6 calculation, insufficient session check, cache check, Groq call, semantic validation, and cache upsert.
Expose `getExerciseAiGuidance` in `src/actions/ai.ts`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/server/ai/guidance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 8B.2**

```bash
git add src/server/queries/ai.ts src/server/ai/guidance.ts src/actions/ai.ts src/server/ai/guidance.test.ts
git commit -m "feat(ai): implement guidance orchestration service with caching and user isolation"
```

---

### Task 8C.1 — Integrate Phase 8 UI placeholders in ExerciseDetailView

**Files:**
- Modify: `src/components/screens/ExerciseDetailView.tsx`
- Modify: `src/components/screens/ExerciseDetailView.test.tsx`

**Interfaces:**
- Consumes: `getExerciseAiGuidance`, `getTrainingProfile`, `updateTrainingProfile`, `ExerciseAiGuidance`
- Produces: Updated `ExerciseDetailView` with real AI guidance, predictions, unavailable/loading/cooldown states, and profile editor.

- [ ] **Step 1: Write failing UI integration tests**

Update `src/components/screens/ExerciseDetailView.test.tsx` to test:
- AI guidance requested lazily on exercise mount when sessions >= 2.
- Renders available recommendation (next weight, rep range, probable PR, reasoning, confidence).
- Insufficient data renders clear message.
- Unavailable state renders Retry button and preserves all Phase 6 deterministic panels.
- Rapid exercise switching discards out-of-order AI responses.
- Collapsible Training Profile form renders and updates profile without breaking view.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/components/screens/ExerciseDetailView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement AI state and rendering in ExerciseDetailView**

In `ExerciseDetailView.tsx`, replace the Phase 8 placeholder copy with real AI guidance integration:
- `probableNextPR` card: display predicted weight, rep step, and `Prediction` label.
- `AI Recommendation` section: display recommended weight, rep range, reasoning, confidence badge.
- `Predicted Future PR` section: display prediction or unavailable notice.
- Mount `TrainingProfileForm` in a collapsed `Training Context` section inside the Odin panel.
- Ensure deterministic Phase 6 metrics, PR cards, charts, and history ledger remain 100% untouched.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/components/screens/ExerciseDetailView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit Task 8C.1**

```bash
git add src/components/screens/ExerciseDetailView.tsx src/components/screens/ExerciseDetailView.test.tsx
git commit -m "feat(ui): connect Groq AI guidance and prediction panels in ExerciseDetailView"
```

---

### Task 8C.2 — Whole-phase security and completion gate

**Files:**
- Modify: `SESSION_NOTES.md`

**Interfaces:**
- Consumes: Full test suite, TypeScript compiler, ESLint, webpack build, Drizzle schema check, browser verification

- [ ] **Step 1: Run full automated verification suite**

Run:
```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm exec drizzle-kit check
pnpm build
git diff --check
```
Expected: All pass cleanly without errors.

- [ ] **Step 2: Client bundle security inspection**

Verify that `GROQ_API_KEY` and `Authorization` headers are completely absent from client bundle build artifacts.

- [ ] **Step 3: Browser UI & mobile responsiveness check**

Start local production server (`pnpm build && pnpm start`) and run browser verification (desktop 1440x1000 and mobile 393x659) verifying layout, text wrapping, keyboard focus, error recovery, and empty/insufficient states.

- [ ] **Step 4: Update SESSION_NOTES.md**

Record Phase 8 implementation details, verification results, schema additions, and handoff state in `SESSION_NOTES.md`.

- [ ] **Step 5: Commit Task 8C.2**

```bash
git add SESSION_NOTES.md
git commit -m "docs: complete Phase 8 Groq AI layer implementation and session notes"
```
