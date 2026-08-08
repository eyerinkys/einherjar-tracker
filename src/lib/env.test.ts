import { describe, expect, it } from 'vitest';
import { parseDatabaseEnv, parseServerEnv } from './env';

const validEnvironment = {
  DATABASE_URL: 'postgresql://app:secret@example.com/tracker?sslmode=require',
  DIRECT_DATABASE_URL: 'postgresql://app:secret@example.com/tracker?sslmode=require',
  BETTER_AUTH_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  BETTER_AUTH_URL: 'https://tracker.example.com',
  BETTER_AUTH_ALLOWED_EMAILS: 'first@example.com,second@example.com',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000,https://tracker.example.com',
};

describe('parseServerEnv', () => {
  it('parses database-only configuration without requiring auth settings', () => {
    expect(
      parseDatabaseEnv({
        DATABASE_URL: validEnvironment.DATABASE_URL,
        DIRECT_DATABASE_URL: validEnvironment.DIRECT_DATABASE_URL,
      })
    ).toEqual({
      DATABASE_URL: validEnvironment.DATABASE_URL,
      DIRECT_DATABASE_URL: validEnvironment.DIRECT_DATABASE_URL,
    });
  });

  it('identifies missing database URLs by variable name', () => {
    expect(() => parseServerEnv({})).toThrow(
      'Invalid server environment: DATABASE_URL, DIRECT_DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, BETTER_AUTH_ALLOWED_EMAILS, BETTER_AUTH_TRUSTED_ORIGINS'
    );
  });

  it('rejects malformed URLs without leaking their values', () => {
    const malformedUrl = 'postgresql://app:super-secret@not a valid host/tracker';

    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        DATABASE_URL: malformedUrl,
      })
    ).toThrow('Invalid server environment: DATABASE_URL');

    try {
      parseServerEnv({
        ...validEnvironment,
        DATABASE_URL: malformedUrl,
      });
    } catch (error) {
      expect(error).not.toContain(malformedUrl);
    }
  });

  it('normalizes exactly two unique allowlisted emails and trusted origins', () => {
    const environment = parseServerEnv({
      ...validEnvironment,
      BETTER_AUTH_ALLOWED_EMAILS: ' First@Example.com , SECOND@example.com ',
      BETTER_AUTH_TRUSTED_ORIGINS:
        'http://localhost:3000/, https://tracker.example.com, https://tracker.example.com/',
    });

    expect(environment.BETTER_AUTH_ALLOWED_EMAILS).toEqual([
      'first@example.com',
      'second@example.com',
    ]);
    expect(environment.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
      'http://localhost:3000',
      'https://tracker.example.com',
    ]);
  });

  it('rejects duplicate allowlisted emails without leaking the configured value', () => {
    const duplicatedEmails = 'private@example.com, PRIVATE@example.com';

    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        BETTER_AUTH_ALLOWED_EMAILS: duplicatedEmails,
      })
    ).toThrow('Invalid server environment: BETTER_AUTH_ALLOWED_EMAILS');

    try {
      parseServerEnv({
        ...validEnvironment,
        BETTER_AUTH_ALLOWED_EMAILS: duplicatedEmails,
      });
    } catch (error) {
      expect(error).not.toContain(duplicatedEmails);
    }
  });

  it('rejects auth URLs and trusted origins containing credentials or paths', () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        BETTER_AUTH_URL: 'https://user:password@tracker.example.com/private',
        BETTER_AUTH_TRUSTED_ORIGINS: 'https://tracker.example.com/auth',
      })
    ).toThrow(
      'Invalid server environment: BETTER_AUTH_URL, BETTER_AUTH_TRUSTED_ORIGINS'
    );
  });
});
