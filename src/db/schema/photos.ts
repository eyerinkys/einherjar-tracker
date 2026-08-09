import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const progressPhotos = pgTable(
  'progress_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull().unique(),
    date: text('date').notNull(),
    tag: text('tag'),
    notes: text('notes'),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('progress_photos_date_format', sql`${table.date} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check('progress_photos_tag_values', sql`${table.tag} IS NULL OR ${table.tag} IN ('front', 'side', 'back')`),
    index('progress_photos_user_date_idx').on(table.userId, table.date),
  ]
);
