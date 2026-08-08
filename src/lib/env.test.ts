import { describe, expect, it } from 'vitest';
import { parseServerEnv } from './env';

describe('parseServerEnv', () => {
  it('identifies missing database URLs by variable name', () => {
    expect(() => parseServerEnv({})).toThrow(
      'Invalid server environment: DATABASE_URL, DIRECT_DATABASE_URL'
    );
  });

  it('rejects malformed URLs without leaking their values', () => {
    const malformedUrl = 'postgresql://app:super-secret@not a valid host/tracker';

    expect(() =>
      parseServerEnv({
        DATABASE_URL: malformedUrl,
        DIRECT_DATABASE_URL: 'postgresql://app:another-secret@example.com/tracker?sslmode=require',
      })
    ).toThrow('Invalid server environment: DATABASE_URL');

    try {
      parseServerEnv({
        DATABASE_URL: malformedUrl,
        DIRECT_DATABASE_URL: 'postgresql://app:another-secret@example.com/tracker?sslmode=require',
      });
    } catch (error) {
      expect(error).not.toContain(malformedUrl);
    }
  });
});
