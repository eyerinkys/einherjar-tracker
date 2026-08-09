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

  it('validates deleteBodyweight payload with valid UUID and rejects non-UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(deleteBodyweightSchema.safeParse({ id: validUuid }).success).toBe(true);
    expect(deleteBodyweightSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(deleteBodyweightSchema.safeParse({ id: '' }).success).toBe(false);
  });
});
