import { sql } from 'drizzle-orm';
import {
  check,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const bodyweightLogs = pgTable(
  'bodyweight_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    weightKg: numeric('weight_kg').notNull(),
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('bodyweight_logs_date_format', sql`${table.date} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check(
      'bodyweight_logs_weight_bounds',
      sql`${table.weightKg} >= 20 AND ${table.weightKg} <= 500`
    ),
    uniqueIndex('bodyweight_logs_user_date_idx').on(table.userId, table.date),
  ]
);
