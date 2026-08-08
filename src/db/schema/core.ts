import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const exerciseCategory = pgEnum('exercise_category', ['compound', 'isolation']);
export const workoutSessionStatus = pgEnum('workout_session_status', ['in_progress', 'completed']);

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    muscleGroup: text('muscle_group').notNull(),
    equipment: text('equipment').notNull(),
    category: exerciseCategory('category').notNull(),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    isCustom: boolean('is_custom').default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('exercises_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('exercises_muscle_group_not_blank', sql`length(trim(${table.muscleGroup})) > 0`),
    check('exercises_equipment_not_blank', sql`length(trim(${table.equipment})) > 0`),
    index('exercises_created_by_user_idx').on(table.createdByUserId),
  ],
);

export const splitDays = pgTable(
  'split_days',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('split_days_name_not_blank', sql`length(trim(${table.name})) > 0`),
    index('split_days_user_sort_order_idx').on(table.userId, table.sortOrder),
  ],
);

export const splitExercises = pgTable(
  'split_exercises',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    splitDayId: uuid('split_day_id')
      .notNull()
      .references(() => splitDays.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sortOrder: integer('sort_order').notNull(),
    targetSets: integer('target_sets').notNull(),
    targetRepMin: integer('target_rep_min').notNull(),
    targetRepMax: integer('target_rep_max').notNull(),
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('split_exercises_target_sets_positive', sql`${table.targetSets} > 0`),
    check('split_exercises_target_rep_min_positive', sql`${table.targetRepMin} > 0`),
    check('split_exercises_target_rep_max_positive', sql`${table.targetRepMax} > 0`),
    check('split_exercises_target_rep_range_valid', sql`${table.targetRepMin} <= ${table.targetRepMax}`),
    index('split_exercises_split_day_sort_order_idx').on(table.splitDayId, table.sortOrder),
    index('split_exercises_exercise_idx').on(table.exerciseId),
  ],
);

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceSplitDayId: uuid('source_split_day_id').references(() => splitDays.id, {
      onDelete: 'set null',
    }),
    splitDayName: text('split_day_name').notNull(),
    status: workoutSessionStatus('status').default('in_progress').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    version: integer('version').default(1).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('workout_sessions_split_day_name_not_blank', sql`length(trim(${table.splitDayName})) > 0`),
    check('workout_sessions_version_positive', sql`${table.version} > 0`),
    check(
      'workout_sessions_completion_state_valid',
      sql`(${table.status} = 'in_progress' AND ${table.completedAt} IS NULL) OR (${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL)`,
    ),
    index('workout_sessions_user_completed_at_idx').on(table.userId, table.completedAt),
    index('workout_sessions_source_split_day_idx').on(table.sourceSplitDayId),
    uniqueIndex('workout_sessions_one_in_progress_per_user')
      .on(table.userId)
      .where(sql`${table.status} = 'in_progress'`),
  ],
);

export const sessionExercises = pgTable(
  'session_exercises',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workoutSessionId: uuid('workout_session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
    exerciseName: text('exercise_name').notNull(),
    sortOrder: integer('sort_order').notNull(),
    targetSets: integer('target_sets').notNull(),
    targetRepMin: integer('target_rep_min').notNull(),
    targetRepMax: integer('target_rep_max').notNull(),
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('session_exercises_name_not_blank', sql`length(trim(${table.exerciseName})) > 0`),
    check('session_exercises_target_sets_positive', sql`${table.targetSets} > 0`),
    check('session_exercises_target_rep_min_positive', sql`${table.targetRepMin} > 0`),
    check('session_exercises_target_rep_max_positive', sql`${table.targetRepMax} > 0`),
    check('session_exercises_target_rep_range_valid', sql`${table.targetRepMin} <= ${table.targetRepMax}`),
    index('session_exercises_session_sort_order_idx').on(table.workoutSessionId, table.sortOrder),
    index('session_exercises_exercise_idx').on(table.exerciseId),
  ],
);

export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionExerciseId: uuid('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    weight: numeric('weight'),
    reps: integer('reps'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    check('workout_sets_set_number_positive', sql`${table.setNumber} > 0`),
    check('workout_sets_weight_non_negative', sql`${table.weight} IS NULL OR ${table.weight} >= 0`),
    check('workout_sets_weight_finite', sql`${table.weight} IS NULL OR ${table.weight} < 'Infinity'::numeric`),
    check(
      'workout_sets_completed_reps_positive',
      sql`${table.isCompleted} = false OR (${table.reps} IS NOT NULL AND ${table.reps} > 0)`,
    ),
    uniqueIndex('workout_sets_session_exercise_set_number_unique').on(table.sessionExerciseId, table.setNumber),
    index('workout_sets_session_exercise_idx').on(table.sessionExerciseId),
  ],
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [exercises.createdByUserId],
    references: [user.id],
  }),
  splitExercises: many(splitExercises),
  sessionExercises: many(sessionExercises),
}));

export const splitDaysRelations = relations(splitDays, ({ one, many }) => ({
  user: one(user, {
    fields: [splitDays.userId],
    references: [user.id],
  }),
  exercises: many(splitExercises),
  sourceSessions: many(workoutSessions),
}));

export const splitExercisesRelations = relations(splitExercises, ({ one }) => ({
  splitDay: one(splitDays, {
    fields: [splitExercises.splitDayId],
    references: [splitDays.id],
  }),
  exercise: one(exercises, {
    fields: [splitExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(user, {
    fields: [workoutSessions.userId],
    references: [user.id],
  }),
  sourceSplitDay: one(splitDays, {
    fields: [workoutSessions.sourceSplitDayId],
    references: [splitDays.id],
  }),
  exercises: many(sessionExercises),
}));

export const sessionExercisesRelations = relations(sessionExercises, ({ one, many }) => ({
  workoutSession: one(workoutSessions, {
    fields: [sessionExercises.workoutSessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [sessionExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(workoutSets),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  sessionExercise: one(sessionExercises, {
    fields: [workoutSets.sessionExerciseId],
    references: [sessionExercises.id],
  }),
}));
