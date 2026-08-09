# Phase 10 — Bodyweight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist user-owned bodyweight logs in Neon PostgreSQL via Drizzle ORM, providing same-day upsert actions, trend statistics, real Recharts visualization, and server hydration while removing bodyweight mock data.

**Architecture:** A new `bodyweight_logs` Drizzle schema table with a `(user_id, date)` unique constraint supports same-day upsert. Server queries (`getBodyweightLogs`, `getBodyweightSummary`) calculate current weight, starting weight, net change, and 4-entry trend metrics. Zod-validated Server Actions (`logBodyweight`, `deleteBodyweightEntry`, `getBodyweightSummaryAction`) enforce strict user isolation and input bounds (20–500 kg, `YYYY-MM-DD` date format). `page.tsx` hydrates `ApplicationShell` and `BodyweightView` with initial summary data.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Zod, Recharts, Vitest.

## Global Constraints

- User isolation: every query and action must require `requireUser()` and scope by `userId`.
- PostgreSQL exact `numeric` storage for bodyweight (`weight_kg`), mapped to JavaScript `number` at the DTO boundary.
- Dates are represented as local `YYYY-MM-DD` string inputs/keys.
- Same-day logging performs an upsert (`ON CONFLICT (user_id, date) DO UPDATE`).
- Net change = `round1dp(currentWeight - startWeight)`.
- Recent trend = `round1dp(latestWeight - earliestWeight)` among the most recent 4 entries (null if < 2 entries).
- Remove obsolete bodyweight mock functions/imports from `dataService.ts`.
- Retain existing UI layout, typography, and Norse visual style in `BodyweightView`.

---

### Task 1: Schema, Migration & Database Layer for Bodyweight

**Files:**
- Create: `src/db/schema/bodyweight.ts`
- Modify: `src/db/schema/index.ts`
- Create: `src/db/schema/bodyweight.test.ts`
- Generate: `drizzle/0002_*.sql`

**Interfaces:**
- Consumes: `user` from `./auth`
- Produces: `bodyweightLogs` table export

- [ ] **Step 1: Write failing schema tests**

Create `src/db/schema/bodyweight.test.ts` testing schema structure and exported symbols:
```typescript
import { describe, it, expect } from 'vitest';
import { bodyweightLogs } from './bodyweight';

describe('bodyweightLogs schema', () => {
  it('defines required table structure and columns', () => {
    expect(bodyweightLogs).toBeDefined();
    expect(bodyweightLogs.id).toBeDefined();
    expect(bodyweightLogs.userId).toBeDefined();
    expect(bodyweightLogs.date).toBeDefined();
    expect(bodyweightLogs.weightKg).toBeDefined();
    expect(bodyweightLogs.notes).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/db/schema/bodyweight.test.ts`
Expected: FAIL (module `./bodyweight` missing).

- [ ] **Step 3: Implement `src/db/schema/bodyweight.ts` and update `src/db/schema/index.ts`**

Create `src/db/schema/bodyweight.ts`:
```typescript
import { sql } from 'drizzle-orm';
import {
  check,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const bodyweightLogs = pgTable(
  'bodyweight_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    weightKg: numeric('weight_kg').notNull(),
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('bodyweight_logs_date_format', sql`${table.date} ~ '^\d{4}-\d{2}-\d{2}$'`),
    check(
      'bodyweight_logs_weight_bounds',
      sql`${table.weightKg} >= 20 AND ${table.weightKg} <= 500`
    ),
    uniqueIndex('bodyweight_logs_user_date_idx').on(table.userId, table.date),
  ]
);
```

Update `src/db/schema/index.ts` to export all from `./bodyweight`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/db/schema/bodyweight.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate migration**

Run: `pnpm db:generate`
Expected: Creates `drizzle/0002_*.sql` containing `CREATE TABLE "bodyweight_logs" ...`.

- [ ] **Step 6: Commit Task 10.1**

```bash
git add src/db/schema/bodyweight.ts src/db/schema/index.ts src/db/schema/bodyweight.test.ts drizzle/
git commit -m "feat(db): add bodyweight_logs schema and migration"
```

---

### Task 2: Bodyweight Types, Validation & Server Queries

**Files:**
- Modify: `src/types/bodyweight.ts`
- Create: `src/lib/validation/bodyweight.ts`
- Create: `src/lib/validation/bodyweight.test.ts`
- Create: `src/server/queries/bodyweight.ts`
- Create: `src/server/queries/bodyweight.test.ts`

**Interfaces:**
- Consumes: `db`, `bodyweightLogs`
- Produces: `BodyweightEntry`, `BodyweightSummaryDTO`, `logBodyweightSchema`, `deleteBodyweightSchema`, `getBodyweightLogs(userId)`, `getBodyweightSummary(userId)`

- [ ] **Step 1: Write failing validation and query unit tests**

Create `src/lib/validation/bodyweight.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { logBodyweightSchema, deleteBodyweightSchema } from './bodyweight';

describe('bodyweight validation schemas', () => {
  it('validates valid logBodyweight payload', () => {
    const res = logBodyweightSchema.safeParse({
      date: '2026-08-09',
      weightKg: 82.5,
      notes: 'Morning weight',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid date and out-of-range weight', () => {
    expect(logBodyweightSchema.safeParse({ date: '2026-8-9', weightKg: 82.5 }).success).toBe(false);
    expect(logBodyweightSchema.safeParse({ date: '2026-08-09', weightKg: 10 }).success).toBe(false);
    expect(logBodyweightSchema.safeParse({ date: '2026-08-09', weightKg: 600 }).success).toBe(false);
  });

  it('validates deleteBodyweight payload', () => {
    expect(deleteBodyweightSchema.safeParse({ id: 'uuid-123' }).success).toBe(true);
    expect(deleteBodyweightSchema.safeParse({ id: '' }).success).toBe(false);
  });
});
```

Create `src/server/queries/bodyweight.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getBodyweightSummary } from './bodyweight';

describe('getBodyweightSummary', () => {
  it('returns empty summary when user has no logs', async () => {
    const summary = await getBodyweightSummary('user-no-bw-data');
    expect(summary).toEqual({
      currentWeight: null,
      startWeight: null,
      startDate: null,
      netChange: null,
      trend: null,
      logs: [],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/lib/validation/bodyweight.test.ts src/server/queries/bodyweight.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement types, validation, and queries**

Update `src/types/bodyweight.ts`:
```typescript
export interface BodyweightEntry {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
}

export interface BodyweightSummaryDTO {
  currentWeight: number | null;
  startWeight: number | null;
  startDate: string | null;
  netChange: number | null;
  trend: number | null;
  logs: BodyweightEntry[];
}
```

Create `src/lib/validation/bodyweight.ts`:
```typescript
import { z } from 'zod';

export const logBodyweightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weightKg: z.number().min(20, 'Weight must be at least 20 kg').max(500, 'Weight must be at most 500 kg'),
  notes: z.string().max(1000).optional(),
});

export const deleteBodyweightSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export type LogBodyweightInput = z.infer<typeof logBodyweightSchema>;
export type DeleteBodyweightInput = z.infer<typeof deleteBodyweightSchema>;
```

Create `src/server/queries/bodyweight.ts`:
```typescript
import 'server-only';
import { db } from '@/db/client';
import { bodyweightLogs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { BodyweightEntry, BodyweightSummaryDTO } from '@/types';

export async function getBodyweightLogs(userId: string): Promise<BodyweightEntry[]> {
  const rows = await db
    .select({
      id: bodyweightLogs.id,
      date: bodyweightLogs.date,
      weightKg: bodyweightLogs.weightKg,
      notes: bodyweightLogs.notes,
    })
    .from(bodyweightLogs)
    .where(eq(bodyweightLogs.userId, userId))
    .orderBy(asc(bodyweightLogs.date), asc(bodyweightLogs.createdAt));

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    weightKg: Number(r.weightKg),
    notes: r.notes ?? undefined,
  }));
}

export async function getBodyweightSummary(userId: string): Promise<BodyweightSummaryDTO> {
  const logs = await getBodyweightLogs(userId);
  if (logs.length === 0) {
    return {
      currentWeight: null,
      startWeight: null,
      startDate: null,
      netChange: null,
      trend: null,
      logs: [],
    };
  }

  const start = logs[0];
  const current = logs[logs.length - 1];
  const startWeight = start.weightKg;
  const currentWeight = current.weightKg;
  const netChange = Math.round((currentWeight - startWeight) * 10) / 10;

  let trend: number | null = null;
  if (logs.length >= 2) {
    const recent = logs.slice(-4);
    const earliest = recent[0].weightKg;
    const latest = recent[recent.length - 1].weightKg;
    trend = Math.round((latest - earliest) * 10) / 10;
  }

  return {
    currentWeight,
    startWeight,
    startDate: start.date,
    netChange,
    trend,
    logs,
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test src/lib/validation/bodyweight.test.ts src/server/queries/bodyweight.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 10.2**

```bash
git add src/types/bodyweight.ts src/lib/validation/bodyweight.ts src/lib/validation/bodyweight.test.ts src/server/queries/bodyweight.ts src/server/queries/bodyweight.test.ts
git commit -m "feat(bodyweight): add validation schemas, types, and server queries"
```

---

### Task 3: Bodyweight Server Actions

**Files:**
- Create: `src/actions/bodyweight.ts`
- Create: `src/actions/bodyweight.test.ts`

**Interfaces:**
- Consumes: `requireUser()`, `logBodyweightSchema`, `deleteBodyweightSchema`, `bodyweightLogs`, `getBodyweightSummary()`
- Produces: `logBodyweight()`, `deleteBodyweightEntry()`, `getBodyweightSummaryAction()`

- [ ] **Step 1: Write failing action tests**

Create `src/actions/bodyweight.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { logBodyweight, deleteBodyweightEntry, getBodyweightSummaryAction } from './bodyweight';

describe('bodyweight Server Actions', () => {
  it('returns UNAUTHENTICATED error when unauthenticated', async () => {
    const res1 = await logBodyweight({ date: '2026-08-09', weightKg: 80 });
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.code).toBe('UNAUTHENTICATED');

    const res2 = await deleteBodyweightEntry({ id: 'some-id' });
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.code).toBe('UNAUTHENTICATED');

    const res3 = await getBodyweightSummaryAction();
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.code).toBe('UNAUTHENTICATED');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/actions/bodyweight.test.ts`
Expected: FAIL (module `./bodyweight` missing).

- [ ] **Step 3: Implement `src/actions/bodyweight.ts`**

Create `src/actions/bodyweight.ts`:
```typescript
'use server';

import { db } from '@/db/client';
import { bodyweightLogs } from '@/db/schema';
import { requireUser } from '@/server/auth/require-user';
import { getBodyweightSummary } from '@/server/queries/bodyweight';
import {
  logBodyweightSchema,
  deleteBodyweightSchema,
  LogBodyweightInput,
  DeleteBodyweightInput,
} from '@/lib/validation/bodyweight';
import type { ActionResult, BodyweightEntry, BodyweightSummaryDTO } from '@/types';
import { eq, and } from 'drizzle-orm';
import { AuthenticationError, AuthorizationError } from '@/server/auth/errors';

export async function logBodyweight(
  input: LogBodyweightInput
): Promise<ActionResult<BodyweightEntry>> {
  try {
    const user = await requireUser();
    const parsed = logBodyweightSchema.parse(input);

    const [row] = await db
      .insert(bodyweightLogs)
      .values({
        userId: user.id,
        date: parsed.date,
        weightKg: parsed.weightKg.toString(),
        notes: parsed.notes,
      })
      .onConflictDoUpdate({
        target: [bodyweightLogs.userId, bodyweightLogs.date],
        set: {
          weightKg: parsed.weightKg.toString(),
          notes: parsed.notes,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      ok: true,
      data: {
        id: row.id,
        date: row.date,
        weightKg: Number(row.weightKg),
        notes: row.notes ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { ok: false, code: 'UNAUTHENTICATED', message: 'You must be signed in.' };
    }
    if (error instanceof AuthorizationError) {
      return { ok: false, code: 'FORBIDDEN', message: 'Access denied.' };
    }
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unable to log bodyweight.',
    };
  }
}

export async function deleteBodyweightEntry(
  input: DeleteBodyweightInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = deleteBodyweightSchema.parse(input);

    const deleted = await db
      .delete(bodyweightLogs)
      .where(and(eq(bodyweightLogs.id, parsed.id), eq(bodyweightLogs.userId, user.id)))
      .returning({ id: bodyweightLogs.id });

    if (deleted.length === 0) {
      return { ok: false, code: 'NOT_FOUND', message: 'Bodyweight entry not found.' };
    }

    return { ok: true, data: { id: deleted[0].id } };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { ok: false, code: 'UNAUTHENTICATED', message: 'You must be signed in.' };
    }
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unable to delete bodyweight entry.',
    };
  }
}

export async function getBodyweightSummaryAction(): Promise<ActionResult<BodyweightSummaryDTO>> {
  try {
    const user = await requireUser();
    const summary = await getBodyweightSummary(user.id);
    return { ok: true, data: summary };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { ok: false, code: 'UNAUTHENTICATED', message: 'You must be signed in.' };
    }
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unable to load bodyweight data.',
    };
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/actions/bodyweight.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 10.3**

```bash
git add src/actions/bodyweight.ts src/actions/bodyweight.test.ts
git commit -m "feat(bodyweight): implement log, delete, and summary Server Actions"
```

---

### Task 4: Connect UI Components, Hydrate Server Data & Clean Up Mocks

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/app/ApplicationShell.tsx`
- Modify: `src/components/screens/BodyweightView.tsx`
- Create: `src/components/screens/BodyweightView.test.tsx`
- Modify: `src/services/dataService.ts`

**Interfaces:**
- Consumes: `getBodyweightSummary(userId)`, `logBodyweight`, `deleteBodyweightEntry`, `getBodyweightSummaryAction`
- Produces: Updated `ApplicationShell` with `initialBodyweightSummary`, interactive `BodyweightView`

- [ ] **Step 1: Write failing BodyweightView component tests**

Create `src/components/screens/BodyweightView.test.tsx` testing:
- Renders empty state when `initialSummary.logs` is empty.
- Renders current weight, starting weight, net change, and chronological entries when populated.
- Submitting log modal calls `logBodyweight` and reconciles UI.
- Delete action calls `deleteBodyweightEntry` and reconciles UI.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/components/screens/BodyweightView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `page.tsx` & `ApplicationShell.tsx`**

In `src/app/page.tsx`:
- Import `getBodyweightSummary` from `@/server/queries/bodyweight`.
- Fetch `getBodyweightSummary(userId)` in `Promise.all`.
- Pass `initialBodyweightSummary` to `ApplicationShell`.

In `src/components/app/ApplicationShell.tsx`:
- Accept `initialBodyweightSummary: BodyweightSummaryDTO` prop.
- Pass `initialSummary={initialBodyweightSummary}` to `BodyweightView`.

- [ ] **Step 4: Update `BodyweightView.tsx` and `dataService.ts`**

In `BodyweightView.tsx`:
- Receive `initialSummary?: BodyweightSummaryDTO` prop.
- Use state `summaryState` initialized from `initialSummary`.
- Handle `handleAddLog` using `logBodyweight({ date, weightKg })`.
- Add delete button next to entries calling `deleteBodyweightEntry({ id })`.
- Support error feedback and inline retry.

In `dataService.ts`:
- Remove `getBodyweightLogs` and `MOCK_BODYWEIGHT_LOGS`.

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test src/components/screens/BodyweightView.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit Task 10.4**

```bash
git add src/app/page.tsx src/components/app/ApplicationShell.tsx src/components/screens/BodyweightView.tsx src/components/screens/BodyweightView.test.tsx src/services/dataService.ts
git commit -m "feat(ui): connect BodyweightView to real backend actions and remove bodyweight mocks"
```

---

### Task 5: Hosted Verification, Migration Application & Handoff

**Files:**
- Modify: `SESSION_NOTES.md`

- [ ] **Step 1: Apply migration to hosted database**

Run: `pnpm db:migrate` (or preloading mode-600 `.env` as required by RULES.md)
Expected: Applies `0002_*.sql` to hosted PostgreSQL.

- [ ] **Step 2: Run full verification suite**

Run:
```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm exec drizzle-kit check
pnpm build
git diff --check
```
Expected: All pass with 0 errors.

- [ ] **Step 3: Update `SESSION_NOTES.md`**

Document Phase 10 completion, migration details, and verification evidence.

- [ ] **Step 4: Commit Task 10.5**

```bash
git add SESSION_NOTES.md
git commit -m "docs: complete Phase 10 bodyweight implementation and session notes"
```
