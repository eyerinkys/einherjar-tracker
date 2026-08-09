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
