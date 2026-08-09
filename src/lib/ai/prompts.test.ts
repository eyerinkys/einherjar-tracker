import { describe, expect, it } from 'vitest';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompts';

describe('prompts', () => {
  it('exports a valid system prompt', () => {
    expect(SYSTEM_PROMPT).toContain('valid JSON');
    expect(SYSTEM_PROMPT).toContain('schema provided');
  });

  describe('buildUserPrompt', () => {
    it('includes profile when provided', () => {
      const prompt = buildUserPrompt(
        'Bench Press',
        false,
        {
          trainingExperience: 'intermediate',
          primaryGoal: 'strength',
          preferredProgressionMethod: 'double_progression',
          availableWeightIncrementsKg: [1.25, 2.5, 5, 10, 15, 20, 25],
          generalTrainingNotes: null
        },
        [{ date: '2026-08-01', weightKg: 100, reps: 5 }]
      );

      expect(prompt).toContain('Exercise: Bench Press (Weighted)');
      expect(prompt).toContain('Experience: intermediate');
      expect(prompt).toContain('Available Weight Increments (kg): 1.25, 2.5');
      expect(prompt).toContain('"weightKg": 100');
    });

    it('handles null profile gracefully', () => {
      const prompt = buildUserPrompt(
        'Pull Up',
        true,
        null,
        [{ date: '2026-08-01', reps: 10 }]
      );

      expect(prompt).toContain('Exercise: Pull Up (Bodyweight)');
      expect(prompt).not.toContain('Training Profile:');
      expect(prompt).toContain('"reps": 10');
    });

    it('handles empty history', () => {
      const prompt = buildUserPrompt(
        'Squat',
        false,
        null,
        []
      );

      expect(prompt).toContain('No previous history available.');
    });
  });
});
