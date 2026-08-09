import { describe, expect, it } from 'vitest';
import { trainingSchedules } from './schedule';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('schedule schema', () => {
  it('exports expected tables and configurations', () => {
    expect(trainingSchedules).toBeDefined();
    
    const config = getTableConfig(trainingSchedules);
    expect(config.name).toBe('training_schedules');
    expect(config.columns.find((c) => c.name === 'id')).toBeDefined();
    expect(config.columns.find((c) => c.name === 'user_id')).toBeDefined();
    expect(config.columns.find((c) => c.name === 'scheduled_days')).toBeDefined();
    expect(config.columns.find((c) => c.name === 'effective_from')).toBeDefined();
    expect(config.columns.find((c) => c.name === 'created_at')).toBeDefined();
    
    expect(config.foreignKeys.length).toBeGreaterThan(0);
  });
});
