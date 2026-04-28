DO $$ BEGIN
 CREATE TYPE "public"."group_type" AS ENUM('SEMINAR', 'GROUP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "type" "group_type" DEFAULT 'GROUP' NOT NULL;