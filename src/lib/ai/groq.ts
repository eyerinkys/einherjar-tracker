import { GROQ_AI_RECOMMENDATION_JSON_SCHEMA } from './schemas';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';

export class GroqClientError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = 'GroqClientError';
  }
}

export async function fetchGroqRecommendation(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model = DEFAULT_MODEL,
  signal?: AbortSignal
) {
  if (!apiKey) {
    throw new GroqClientError('Groq API key is missing');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ai_recommendation',
          schema: GROQ_AI_RECOMMENDATION_JSON_SCHEMA,
          strict: true
        }
      },
      temperature: 0.2, // Low temperature for consistent outputs
      max_completion_tokens: 800, // Limit output size
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GroqClientError(`Groq API error: ${response.statusText} - ${errorText}`, response.status);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new GroqClientError('Invalid response format from Groq API');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new GroqClientError('Failed to parse Groq response as JSON');
  }
}
