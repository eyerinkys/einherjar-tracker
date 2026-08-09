export type WorkoutMutationErrorCode = 'CONFLICT' | 'EMPTY_WORKOUT' | 'NO_COMPLETED_SETS';

export class WorkoutMutationError extends Error {
  constructor(public readonly code: WorkoutMutationErrorCode, message: string) {
    super(message);
    this.name = 'WorkoutMutationError';
  }
}
