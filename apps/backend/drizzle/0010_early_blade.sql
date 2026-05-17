DO $$ BEGIN
 CREATE TYPE "public"."eval_type" AS ENUM('none', 'pass_fail', 'graded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "eval_type" "eval_type" DEFAULT 'none' NOT NULL;