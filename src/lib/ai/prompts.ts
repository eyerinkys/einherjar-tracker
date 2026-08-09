import type { TrainingProfileDTO } from '@/types/ai';

export const SYSTEM_PROMPT = `You are the Einherjar Gym Tracker AI assistant, a specialized strength training coach.
Your purpose is to analyze a user's workout history for a specific exercise and recommend the optimal weight and rep range for their next session.

Follow these rules strictly:
1. You MUST output ONLY valid JSON matching the exact schema provided.
2. Consider the user's training profile (experience, goal, progression method) when making recommendations.
3. For weighted exercises, recommend a specific weight (in kg) and a target rep range.
4. For bodyweight exercises, nextRecommendedWeightKg and probableNextPR.weightKg MUST be null.
5. Apply progressive overload principles appropriately based on their history.
6. If the user's performance is stagnating or regressing, adjust the volume/intensity recommendations to help them break through the plateau.
7. Keep reasoning concise (max 280 characters).`;

export function buildUserPrompt(
  exerciseName: string,
  isBodyweight: boolean,
  profile: TrainingProfileDTO | null,
  history: unknown[]
): string {
  let prompt = `Exercise: ${exerciseName} (${isBodyweight ? 'Bodyweight' : 'Weighted'})\n`;
  
  if (profile) {
    prompt += `\nTraining Profile:\n`;
    prompt += `- Experience: ${profile.trainingExperience || 'Unknown'}\n`;
    prompt += `- Goal: ${profile.primaryGoal || 'Unknown'}\n`;
    prompt += `- Progression Method: ${profile.preferredProgressionMethod || 'Unknown'}\n`;
    if (profile.availableWeightIncrementsKg.length > 0) {
      prompt += `- Available Weight Increments (kg): ${profile.availableWeightIncrementsKg.join(', ')}\n`;
    }
  }

  prompt += `\nRecent Workout History:\n`;
  if (history.length === 0) {
    prompt += `No previous history available.\n`;
  } else {
    prompt += JSON.stringify(history, null, 2) + '\n';
  }

  prompt += `\nBased on this data, provide your recommendation in the required JSON format.`;

  return prompt;
}
