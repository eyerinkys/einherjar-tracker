CREATE TABLE "training_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"scheduled_days" jsonb DEFAULT '{}' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_photos" DROP CONSTRAINT "progress_photos_tag_values";--> statement-breakpoint
ALTER TABLE "training_profiles" ADD COLUMN "iana_timezone" text;--> statement-breakpoint
ALTER TABLE "training_schedules" ADD CONSTRAINT "training_schedules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_schedules_user_effective_idx" ON "training_schedules" USING btree ("user_id","effective_from");--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_tag_values" CHECK ("progress_photos"."tag" IS NULL OR "progress_photos"."tag" IN ('front', 'side', 'back'));