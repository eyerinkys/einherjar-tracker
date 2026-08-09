import { sql } from 'drizzle-orm';
import {
  check,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { exercises } from './core';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const trainingProfiles = pgTable('training_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  trainingExperience: text('training_experience'),
  primaryGoal: text('primary_goal'),
  preferredProgressionMethod: text('preferred_progression_method'),
  availableWeightIncrementsKg: jsonb('available_weight_increments_kg').notNull().default('[]'),
  generalTrainingNotes: text('general_training_notes'),
  ianaTimezone: text('iana_timezone'),
  createdAt,
  updatedAt,
});

export const aiGuidanceCache = pgTable(
  'ai_guidance_cache',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    contextHash: text('context_hash').notNull(),
    responseJson: jsonb('response_json'),
    model: text('model').notNull(),
    failureCode: text('failure_code'),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).notNull(),
    retryAfter: timestamp('retry_after', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.exerciseId] }),
    check(
      'ai_guidance_cache_valid_state',
      sql`(${table.responseJson} IS NOT NULL AND ${table.failureCode} IS NULL) OR (${table.responseJson} IS NULL AND ${table.failureCode} IS NOT NULL)`
    ),
  ]
);
