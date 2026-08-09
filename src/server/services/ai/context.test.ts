import { describe, expect, it } from 'vitest';
import { hashContext } from './context';

describe('context hashing', () => {
  it('generates consistent hash for same profile and history', () => {
    const profile = { trainingExperience: 'advanced', primaryGoal: 'strength' };
    const history = [
      { date: '2026-08-01', sets: [{ weightKg: 100, reps: 5 }] },
      { date: '2026-07-28', sets: [{ weightKg: 95, reps: 5 }] }
    ];

    const hash1 = hashContext(profile, history);
    const hash2 = hashContext(profile, history);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('generates different hash when profile changes', () => {
    const profile1 = { trainingExperience: 'advanced', primaryGoal: 'strength' };
    const profile2 = { trainingExperience: 'intermediate', primaryGoal: 'strength' };
    const history = [
      { date: '2026-08-01', sets: [{ weightKg: 100, reps: 5 }] }
    ];

    const hash1 = hashContext(profile1, history);
    const hash2 = hashContext(profile2, history);

    expect(hash1).not.toBe(hash2);
  });

  it('generates different hash when history changes', () => {
    const profile = { trainingExperience: 'advanced' };
    const history1 = [{ date: '2026-08-01', sets: [{ weightKg: 100, reps: 5 }] }];
    const history2 = [{ date: '2026-08-01', sets: [{ weightKg: 105, reps: 5 }] }];

    const hash1 = hashContext(profile, history1);
    const hash2 = hashContext(profile, history2);

    expect(hash1).not.toBe(hash2);
  });

  it('generates same hash regardless of history array order', () => {
    const profile = { trainingExperience: 'advanced' };
    const session1 = { date: '2026-08-01T10:00:00.000Z', sets: [] };
    const session2 = { date: '2026-07-28T10:00:00.000Z', sets: [] };

    const hash1 = hashContext(profile, [session1, session2]);
    const hash2 = hashContext(profile, [session2, session1]);

    expect(hash1).toBe(hash2);
  });
});
