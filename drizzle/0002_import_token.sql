ALTER TABLE "users" ADD COLUMN "import_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "import_token_created_at" timestamp with time zone;