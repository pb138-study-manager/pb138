CREATE TABLE IF NOT EXISTS "assignment_subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_date" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignment_subtasks" ADD CONSTRAINT "assignment_subtasks_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
