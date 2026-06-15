ALTER TABLE "folders" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;