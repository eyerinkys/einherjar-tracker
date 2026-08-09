import 'dotenv/config';
import { fetchGroqRecommendation } from '../src/lib/ai/groq';
import { SYSTEM_PROMPT } from '../src/lib/ai/prompts';
import { getAiEnv } from '../src/lib/env';

async function main() {
  const env = getAiEnv();
  const apiKey = process.argv[2] || env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('Error: No Groq API key found.');
    console.error('Please pass the key as an argument or add GROQ_API_KEY to your .env.local file:');
    console.error('  npx tsx scripts/verify-groq-key.ts <YOUR_GROQ_API_KEY>');
    console.error('  OR set GROQ_API_KEY=gsk_... in .env.local');
    process.exit(1);
  }

  console.log('Sending test request to Groq API...');
  
  const testUserPrompt = `Exercise: Bench Press (Weighted)
Training Profile:
- Experience: intermediate
- Goal: strength
- Progression Method: double_progression
- Available Weight Increments (kg): 2.5, 5

Recent Workout History:
[
  {
    "date": "2026-08-01T10:00:00.000Z",
    "sets": [
      { "reps": 8, "weightKg": 80 },
      { "reps": 8, "weightKg": 80 },
      { "reps": 7, "weightKg": 80 }
    ]
  },
  {
    "date": "2026-08-05T10:00:00.000Z",
    "sets": [
      { "reps": 8, "weightKg": 80 },
      { "reps": 8, "weightKg": 80 },
      { "reps": 8, "weightKg": 80 }
    ]
  }
]

Based on this data, provide your recommendation in the required JSON format.`;

  try {
    const startTime = Date.now();
    const result = await fetchGroqRecommendation(SYSTEM_PROMPT, testUserPrompt, apiKey);
    const duration = Date.now() - startTime;

    console.log('\n✅ Groq API Key is VALID!');
    console.log(`Response received in ${duration}ms:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('\n❌ Groq API Verification Failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
