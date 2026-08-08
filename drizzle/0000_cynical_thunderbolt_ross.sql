CREATE TYPE "public"."exercise_category" AS ENUM('compound', 'isolation');--> statement-breakpoint
CREATE TYPE "public"."workout_session_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment" text NOT NULL,
	"category" "exercise_category" NOT NULL,
	"created_by_user_id" text,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_not_blank" CHECK (length(trim("exercises"."name")) > 0),
	CONSTRAINT "exercises_muscle_group_not_blank" CHECK (length(trim("exercises"."muscle_group")) > 0),
	CONSTRAINT "exercises_equipment_not_blank" CHECK (length(trim("exercises"."equipment")) > 0)
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"exercise_id" uuid,
	"exercise_name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"target_sets" integer NOT NULL,
	"target_rep_min" integer NOT NULL,
	"target_rep_max" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_exercises_name_not_blank" CHECK (length(trim("session_exercises"."exercise_name")) > 0),
	CONSTRAINT "session_exercises_target_sets_positive" CHECK ("session_exercises"."target_sets" > 0),
	CONSTRAINT "session_exercises_target_rep_min_positive" CHECK ("session_exercises"."target_rep_min" > 0),
	CONSTRAINT "session_exercises_target_rep_max_positive" CHECK ("session_exercises"."target_rep_max" > 0),
	CONSTRAINT "session_exercises_target_rep_range_valid" CHECK ("session_exercises"."target_rep_min" <= "session_exercises"."target_rep_max")
);
--> statement-breakpoint
CREATE TABLE "split_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "split_days_name_not_blank" CHECK (length(trim("split_days"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "split_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"target_sets" integer NOT NULL,
	"target_rep_min" integer NOT NULL,
	"target_rep_max" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "split_exercises_target_sets_positive" CHECK ("split_exercises"."target_sets" > 0),
	CONSTRAINT "split_exercises_target_rep_min_positive" CHECK ("split_exercises"."target_rep_min" > 0),
	CONSTRAINT "split_exercises_target_rep_max_positive" CHECK ("split_exercises"."target_rep_max" > 0),
	CONSTRAINT "split_exercises_target_rep_range_valid" CHECK ("split_exercises"."target_rep_min" <= "split_exercises"."target_rep_max")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source_split_day_id" uuid,
	"split_day_name" text NOT NULL,
	"status" "workout_session_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sessions_split_day_name_not_blank" CHECK (length(trim("workout_sessions"."split_day_name")) > 0),
	CONSTRAINT "workout_sessions_version_positive" CHECK ("workout_sessions"."version" > 0),
	CONSTRAINT "workout_sessions_completion_state_valid" CHECK (("workout_sessions"."status" = 'in_progress' AND "workout_sessions"."completed_at" IS NULL) OR ("workout_sessions"."status" = 'completed' AND "workout_sessions"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight" numeric,
	"reps" integer,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sets_set_number_positive" CHECK ("workout_sets"."set_number" > 0),
	CONSTRAINT "workout_sets_weight_non_negative" CHECK ("workout_sets"."weight" IS NULL OR "workout_sets"."weight" >= 0),
	CONSTRAINT "workout_sets_weight_finite" CHECK ("workout_sets"."weight" IS NULL OR "workout_sets"."weight" < 'Infinity'::numeric),
	CONSTRAINT "workout_sets_completed_reps_positive" CHECK ("workout_sets"."is_completed" = false OR ("workout_sets"."reps" IS NOT NULL AND "workout_sets"."reps" > 0))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_days" ADD CONSTRAINT "split_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_exercises" ADD CONSTRAINT "split_exercises_split_day_id_split_days_id_fk" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_exercises" ADD CONSTRAINT "split_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_source_split_day_id_split_days_id_fk" FOREIGN KEY ("source_split_day_id") REFERENCES "public"."split_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "exercises_created_by_user_idx" ON "exercises" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "session_exercises_session_sort_order_idx" ON "session_exercises" USING btree ("workout_session_id","sort_order");--> statement-breakpoint
CREATE INDEX "session_exercises_exercise_idx" ON "session_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "split_days_user_sort_order_idx" ON "split_days" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "split_exercises_split_day_sort_order_idx" ON "split_exercises" USING btree ("split_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "split_exercises_exercise_idx" ON "split_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_completed_at_idx" ON "workout_sessions" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "workout_sessions_source_split_day_idx" ON "workout_sessions" USING btree ("source_split_day_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_one_in_progress_per_user" ON "workout_sessions" USING btree ("user_id") WHERE "workout_sessions"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sets_session_exercise_set_number_unique" ON "workout_sets" USING btree ("session_exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "workout_sets_session_exercise_idx" ON "workout_sets" USING btree ("session_exercise_id");