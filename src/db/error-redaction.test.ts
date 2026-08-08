import { describe, expect, it } from 'vitest';
import { getSafeDatabaseCheckFailureMessage } from './error-redaction';

describe('getSafeDatabaseCheckFailureMessage', () => {
  it('never forwards a credential-bearing PostgreSQL URL from a synthetic driver error', () => {
    const message = getSafeDatabaseCheckFailureMessage(
      new Error('Connection failed for postgresql://other:leaked-password@db.example.test/tracker'),
    );

    expect(message).not.toContain('leaked-password');
    expect(message).toBe('Database check failed. Connection details were redacted.');
  });
});
