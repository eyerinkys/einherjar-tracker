CREATE TABLE "bodyweight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"weight_kg" numeric NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bodyweight_logs_date_format" CHECK ("bodyweight_logs"."date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "bodyweight_logs_weight_bounds" CHECK ("bodyweight_logs"."weight_kg" >= 20 AND "bodyweight_logs"."weight_kg" <= 500)
);
--> statement-breakpoint
ALTER TABLE "bodyweight_logs" ADD CONSTRAINT "bodyweight_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bodyweight_logs_user_date_idx" ON "bodyweight_logs" USING btree ("user_id","date");