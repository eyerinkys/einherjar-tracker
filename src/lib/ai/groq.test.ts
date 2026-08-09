import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchGroqRecommendation, GroqClientError } from './groq';

const mockResponseJson = {
  nextRecommendedWeightKg: 100,
  targetRepRange: { min: 8, max: 10 },
  probableNextPR: { weightKg: 105, reps: 5 },
  reasoning: 'Steady progress observed.',
  confidence: 'high'
};

describe('fetchGroqRecommendation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws if API key is missing', async () => {
    await expect(fetchGroqRecommendation('system', 'user', ''))
      .rejects
      .toThrow(GroqClientError);
  });

  it('successfully fetches and parses recommendation', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponseJson)
            }
          }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchGroqRecommendation('system', 'user', 'fake-key');
    expect(result).toEqual(mockResponseJson);
    
    // Verify fetch arguments
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    
    const requestInit = callArgs[1];
    expect(requestInit.headers.Authorization).toBe('Bearer fake-key');
    const body = JSON.parse(requestInit.body);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it('throws on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Invalid schema')
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchGroqRecommendation('system', 'user', 'fake-key'))
      .rejects
      .toThrow(/Groq API error: Bad Request - Invalid schema/);
  });

  it('throws if JSON is invalid', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: 'not valid json'
            }
          }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchGroqRecommendation('system', 'user', 'fake-key'))
      .rejects
      .toThrow(/Failed to parse Groq response/);
  });
});
