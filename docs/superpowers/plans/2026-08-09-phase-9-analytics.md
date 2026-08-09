# Phase 9 — Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder dashboard analytics with concise aggregates and PR feeds derived directly from completed workout history and Phase 6 deterministic progression calculations, enriched with cached Phase 8 AI guidance when available.

**Architecture:** Server Action `getAnalyticsOverview` calls server query `getAnalyticsOverviewData(userId)` which batch-fetches the user's completed workout history, exercises, split targets, and cached AI guidance. It runs Phase 6 pure functions (`deriveWorkoutFacts`, `derivePersonalRecords`, `classifyProgression`) in memory to compute objective status counts, status groupings, and a 30-day PR feed without mutating database state or triggering external Groq calls.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Vitest.

## Global Constraints

- Completed workout history remains the sole source of truth.
- Phase 6 deterministic outputs must drive all analytics counts, statuses, grouping, PRs, and trends.
- Cached Phase 8 AI guidance may enrich displayed guidance text only. It must never alter deterministic classifications, PRs, or summary counts.
- Do not trigger new Groq requests from the Analytics page. Only consume existing cached AI guidance when available.
- Avoid N+1 database queries; batch-fetch the authenticated user's relevant completed workout history/exercise targets where practical, then run the existing Phase 6 pure functions in memory.
- Handle INSUFFICIENT_DATA honestly and do not count it as progressing, stalled, or regressing.
- Do not add a materialized/precomputed analytics table.
- Preserve the existing Analytics UI and design. No redesign or new features.
- Remove only the mocks made obsolete by Phase 9.
- Keep strict server-side user isolation.

---

### Task 1: Define Analytics DTOs and Contracts

**Files:**
- Create: `src/types/analytics.ts`
- Modify: `src/types/index.ts`
- Create: `src/types/analytics.test.ts`

**Interfaces:**
- Consumes: `ProgressionStatus` from `@/types/progression`
- Produces: `AnalyticsItemDTO`, `AnalyticsPRDTO`, `AnalyticsSummaryDTO`, `AnalyticsOverviewDTO`

- [ ] **Step 1: Write failing analytics type contract tests**

Create `src/types/analytics.test.ts` to test:
- `AnalyticsOverviewDTO` structure and property types.
- Ensure `AnalyticsItemDTO` includes `exerciseId`, `exerciseName`, `status`, `guidance`, `comparisonText`, `nextWeight`, `targetRepMin`, `targetRepMax`.
- Ensure `AnalyticsPRDTO` includes `exerciseId`, `exerciseName`, `recordType`, `weight`, `reps`, `estimated1RM`, `achievedDate`, `isNewRecord`.

```typescript
import { describe, it, expect } from 'vitest';
import type { AnalyticsOverviewDTO, AnalyticsItemDTO, AnalyticsPRDTO } from './analytics';

describe('Analytics DTO Contracts', () => {
  it('instantiates valid AnalyticsOverviewDTO structure', () => {
    const item: AnalyticsItemDTO = {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      status: 'PROGRESSING',
      guidance: 'Keep up the current load',
      comparisonText: '+1 rep improvement',
      nextWeight: 80,
      targetRepMin: 5,
      targetRepMax: 5,
    };

    const pr: AnalyticsPRDTO = {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      recordType: 'HIGHEST_LOAD',
      weight: 80,
      reps: 5,
      estimated1RM: 93.3,
      achievedDate: '2026-08-04',
      isNewRecord: true,
    };

    const overview: AnalyticsOverviewDTO = {
      summary: {
        progressingCount: 1,
        readyCount: 0,
        stalledCount: 0,
        recentPRsCount: 1,
        insufficientCount: 0,
      },
      readyList: [],
      stalledList: [],
      progressingList: [item],
      achievedPRs: [pr],
    };

    expect(overview.summary.progressingCount).toBe(1);
    expect(overview.progressingList[0].exerciseName).toBe('Bench Press');
    expect(overview.achievedPRs[0].weight).toBe(80);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/types/analytics.test.ts`
Expected: FAIL (module `./analytics` missing).

- [ ] **Step 3: Implement `src/types/analytics.ts` and update `src/types/index.ts`**

Create `src/types/analytics.ts`:
```typescript
import type { ProgressionStatus } from './progression';

export interface AnalyticsItemDTO {
  exerciseId: string;
  exerciseName: string;
  status: ProgressionStatus;
  guidance: string;
  comparisonText: string;
  nextWeight: number | null;
  targetRepMin: number;
  targetRepMax: number;
}

export interface AnalyticsPRDTO {
  exerciseId: string;
  exerciseName: string;
  recordType: 'HIGHEST_LOAD' | 'REPS_AT_LOAD' | 'ESTIMATED_1RM' | 'SESSION_VOLUME';
  weight: number | null;
  reps: number;
  estimated1RM: number | null;
  achievedDate: string;
  isNewRecord?: boolean;
}

export interface AnalyticsSummaryDTO {
  progressingCount: number;
  readyCount: number;
  stalledCount: number;
  recentPRsCount: number;
  insufficientCount: number;
}

export interface AnalyticsOverviewDTO {
  summary: AnalyticsSummaryDTO;
  readyList: AnalyticsItemDTO[];
  stalledList: AnalyticsItemDTO[];
  progressingList: AnalyticsItemDTO[];
  achievedPRs: AnalyticsPRDTO[];
}
```

Update `src/types/index.ts` to export all symbols from `./analytics`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/types/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 9.1**

```bash
git add src/types/analytics.ts src/types/index.ts src/types/analytics.test.ts
git commit -m "feat(analytics): define analytics DTO types and contracts"
```

---

### Task 2: Implement Analytics Server Query Aggregator

**Files:**
- Create: `src/server/queries/analytics.ts`
- Create: `src/server/queries/analytics.test.ts`

**Interfaces:**
- Consumes: `db`, `workoutSessions`, `sessionExercises`, `workoutSets`, `exercises`, `splitExercises`, `aiGuidanceCache`, `deriveWorkoutFacts`, `derivePersonalRecords`, `classifyProgression`
- Produces: `getAnalyticsOverviewData(userId: string): Promise<AnalyticsOverviewDTO>`

- [ ] **Step 1: Write failing analytics server query tests**

Create `src/server/queries/analytics.test.ts` testing:
- Empty history returns 0 for all summary counts and empty arrays for lists.
- User with 1 completed baseline session returns `insufficientCount: 1` and 0 for progressing/ready/stalled.
- User with multi-session history generates correct deterministic classification, populates `readyList`, `stalledList`, `progressingList`, and PR achievements within the 30-day window.
- Cached AI guidance enriches `guidance` text on `AnalyticsItemDTO` without altering progression status or counts.
- Strict user isolation: User A's query never includes User B's completed sessions or PRs.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getAnalyticsOverviewData } from './analytics';

describe('getAnalyticsOverviewData', () => {
  it('returns empty summary when user has no logged workouts', async () => {
    const result = await getAnalyticsOverviewData('user-no-data');
    expect(result.summary).toEqual({
      progressingCount: 0,
      readyCount: 0,
      stalledCount: 0,
      recentPRsCount: 0,
      insufficientCount: 0,
    });
    expect(result.readyList).toHaveLength(0);
    expect(result.stalledList).toHaveLength(0);
    expect(result.progressingList).toHaveLength(0);
    expect(result.achievedPRs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/server/queries/analytics.test.ts`
Expected: FAIL (module `./analytics` missing).

- [ ] **Step 3: Implement `src/server/queries/analytics.ts`**

Create `src/server/queries/analytics.ts`:
- Import `'server-only'`.
- Efficiently fetch all completed sessions, session exercises, workout sets, visible exercises, split exercise target mappings, and cached AI guidance for `userId`.
- Construct `ExerciseHistory` per exercise.
- Run `deriveWorkoutFacts(history)`, `derivePersonalRecords(facts)`, and `classifyProgression(facts, targetRepMin, targetRepMax)`.
- Map outcomes into `readyList` (`READY_TO_INCREASE_LOAD`), `stalledList` (`STALLED` | `REGRESSING`), and `progressingList` (`PROGRESSING` | `ADAPTING_TO_NEW_LOAD`).
- For exercises with `INSUFFICIENT_DATA`, increment `insufficientCount` without putting them into status lists.
- Collect PR achievements across all exercises achieved within the 30-day recent window.
- Attach cached AI guidance when available, falling back to Phase 6 `explanation`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/server/queries/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 9.2**

```bash
git add src/server/queries/analytics.ts src/server/queries/analytics.test.ts
git commit -m "feat(analytics): implement server query aggregator for analytics overview"
```

---

### Task 3: Implement Analytics Server Action

**Files:**
- Create: `src/actions/analytics.ts`
- Create: `src/actions/analytics.test.ts`

**Interfaces:**
- Consumes: `requireUser()`, `getAnalyticsOverviewData()`
- Produces: `getAnalyticsOverview(): Promise<ActionResult<AnalyticsOverviewDTO>>`

- [ ] **Step 1: Write failing action tests**

Create `src/actions/analytics.test.ts` testing:
- Returns `UNAUTHENTICATED` error if user is unauthenticated.
- Returns `{ ok: true, data: AnalyticsOverviewDTO }` for authenticated user.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getAnalyticsOverview } from './analytics';

describe('getAnalyticsOverview action', () => {
  it('returns UNAUTHENTICATED error when unauthenticated', async () => {
    const res = await getAnalyticsOverview();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('UNAUTHENTICATED');
    }
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/actions/analytics.test.ts`
Expected: FAIL (module `./analytics` missing).

- [ ] **Step 3: Implement `src/actions/analytics.ts`**

Create `src/actions/analytics.ts`:
- Add `'use server'`.
- Import `requireUser`, `getAnalyticsOverviewData`, `ActionResult`, `AuthenticationError`, `AuthorizationError`.
- Wrap call in try/catch handling auth errors gracefully.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/actions/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 9.3**

```bash
git add src/actions/analytics.ts src/actions/analytics.test.ts
git commit -m "feat(analytics): implement getAnalyticsOverview Server Action"
```

---

### Task 4: Connect Analytics UI and Remove Replaced Mocks

**Files:**
- Modify: `src/components/screens/AnalyticsView.tsx`
- Modify: `src/components/screens/AnalyticsView.test.tsx`
- Modify: `src/services/dataService.ts`
- Modify: `src/data/mock/progression.ts` (remove obsolete mock insights/PRs exports if unused elsewhere)

**Interfaces:**
- Consumes: `getAnalyticsOverview()`
- Produces: Updated `AnalyticsView` component rendering live backend data.

- [ ] **Step 1: Write failing AnalyticsView integration tests**

Update `src/components/screens/AnalyticsView.test.tsx` to test:
- Initial mount shows loading state while `getAnalyticsOverview()` is in flight.
- Renders `EmptyState` when user has no progression or PR data.
- Renders full summary grid, ready section, stalled section, progressing section, and PR ledger when populated.
- Shows error state and retry button if action fails.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/components/screens/AnalyticsView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `AnalyticsView.tsx` and `dataService.ts`**

Update `AnalyticsView.tsx`:
- Replace mock imports `getAIInsights()` and `getAchievedPRs()` with `getAnalyticsOverview()` Server Action.
- Manage state for `overviewData`, `loading`, `error`.
- Render metrics and sections from `overviewData`.

Update `dataService.ts`:
- Remove `getAIInsights()` and `getAchievedPRs()` getters.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/components/screens/AnalyticsView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit Task 9.4**

```bash
git add src/components/screens/AnalyticsView.tsx src/components/screens/AnalyticsView.test.tsx src/services/dataService.ts src/data/mock/progression.ts
git commit -m "feat(ui): connect AnalyticsView to real server data and clean up obsolete mocks"
```

---

### Task 5: Whole-Phase Verification and Handoff

**Files:**
- Modify: `SESSION_NOTES.md`

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
Expected: All pass cleanly with 0 errors.

- [ ] **Step 2: Update `SESSION_NOTES.md`**

Document Phase 9 completed tasks, verification metrics, and system status in `SESSION_NOTES.md`.

- [ ] **Step 3: Commit Task 9.5**

```bash
git add SESSION_NOTES.md
git commit -m "docs: complete Phase 9 analytics implementation and session notes"
```
