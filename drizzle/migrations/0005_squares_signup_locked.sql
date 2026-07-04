ALTER TABLE "squares_config" ADD COLUMN "signup_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "squares_config" ADD COLUMN "signup_locked_at" timestamp;