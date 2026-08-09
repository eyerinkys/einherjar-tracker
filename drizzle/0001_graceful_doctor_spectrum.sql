CREATE TABLE "ai_guidance_cache" (
	"user_id" text NOT NULL,
	"exercise_id" uuid NOT NULL,
	"context_hash" text NOT NULL,
	"response_json" jsonb,
	"model" text NOT NULL,
	"failure_code" text,
	"last_attempt_at" timestamp with time zone NOT NULL,
	"retry_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_guidance_cache_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id"),
	CONSTRAINT "ai_guidance_cache_valid_state" CHECK (("ai_guidance_cache"."response_json" IS NOT NULL AND "ai_guidance_cache"."failure_code" IS NULL) OR ("ai_guidance_cache"."response_json" IS NULL AND "ai_guidance_cache"."failure_code" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "training_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"training_experience" text,
	"primary_goal" text,
	"preferred_progression_method" text,
	"available_weight_increments_kg" jsonb DEFAULT '[]' NOT NULL,
	"general_training_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_guidance_cache" ADD CONSTRAINT "ai_guidance_cache_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_guidance_cache" ADD CONSTRAINT "ai_guidance_cache_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_profiles" ADD CONSTRAINT "training_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;