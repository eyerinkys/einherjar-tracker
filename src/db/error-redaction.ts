const databaseCheckFailureMessage = 'Database check failed. Connection details were redacted.';

export function getSafeDatabaseCheckFailureMessage(_error: unknown): string {
  void _error;
  return databaseCheckFailureMessage;
}
