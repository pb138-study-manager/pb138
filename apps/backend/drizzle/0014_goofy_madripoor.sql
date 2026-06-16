ALTER TABLE "events" ADD COLUMN "assignment_id" integer;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "storage_path" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
