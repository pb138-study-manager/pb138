DO $$ BEGIN
 CREATE TYPE "public"."event_type" AS ENUM('EVENT', 'DEADLINE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "type" "event_type" DEFAULT 'EVENT' NOT NULL;