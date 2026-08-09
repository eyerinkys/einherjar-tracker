import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { trainingProfiles, aiGuidanceCache } from './ai';

describe('ai schema', () => {
  it('defines trainingProfiles table correctly', () => {
    const config = getTableConfig(trainingProfiles);
    
    expect(config.name).toBe('training_profiles');
    
    // Check columns
    const columns = config.columns.map((c) => c.name);
    expect(columns).toContain('user_id');
    expect(columns).toContain('training_experience');
    expect(columns).toContain('primary_goal');
    expect(columns).toContain('preferred_progression_method');
    expect(columns).toContain('available_weight_increments_kg');
    expect(columns).toContain('general_training_notes');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');

    // Check primary key
    const pks = config.primaryKeys.flatMap((pk) => pk.columns.map((c) => c.name));
    const inlinePks = config.columns.filter((c) => c.primary).map((c) => c.name);
    expect(pks.length + inlinePks.length).toBeGreaterThan(0);
    // Check foreign keys
    const fks = config.foreignKeys;
    expect(fks.length).toBe(1); // user_id
    expect(fks[0].onDelete).toBe('cascade');
  });

  it('defines aiGuidanceCache table correctly', () => {
    const config = getTableConfig(aiGuidanceCache);
    
    expect(config.name).toBe('ai_guidance_cache');
    
    // Check columns
    const columns = config.columns.map((c) => c.name);
    expect(columns).toContain('user_id');
    expect(columns).toContain('exercise_id');
    expect(columns).toContain('context_hash');
    expect(columns).toContain('response_json');
    expect(columns).toContain('model');
    expect(columns).toContain('failure_code');
    expect(columns).toContain('last_attempt_at');
    expect(columns).toContain('retry_after');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');

    // Check primary key
    const pks = config.primaryKeys;
    expect(pks.length).toBeGreaterThan(0);
    const pkCols = pks[0].columns.map((c) => c.name);
    expect(pkCols).toContain('user_id');
    expect(pkCols).toContain('exercise_id');
    
    // Check foreign keys
    const fks = config.foreignKeys;
    expect(fks.length).toBe(2); // user_id and exercise_id
    expect(fks[0].onDelete).toBe('cascade');
    expect(fks[1].onDelete).toBe('cascade');
    
    // Check constraints
    const checks = config.checks;
    expect(checks.length).toBe(1);
    expect(checks[0].name).toBe('ai_guidance_cache_valid_state');
  });
});
