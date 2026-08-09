import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const trainingSchedules = pgTable(
  'training_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Object mapping weekday string ("0"-"6") to nullable splitDayId
    // e.g. { "1": "uuid-for-push", "3": "uuid-for-pull", "5": null }
    scheduledDays: jsonb('scheduled_days').notNull().default('{}'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).defaultNow().notNull(),
    createdAt,
  },
  (table) => [
    index('training_schedules_user_effective_idx').on(table.userId, table.effectiveFrom),
  ]
);
