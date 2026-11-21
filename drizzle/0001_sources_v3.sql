ALTER TABLE "preferences" ADD COLUMN "link_sources" jsonb;
--> statement-breakpoint
UPDATE "preferences" SET "sources" = '[]'::jsonb;
