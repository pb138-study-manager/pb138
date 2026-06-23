CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs" ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_happened_at_idx" ON "audit_logs" ("happened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_user_id_idx" ON "events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_start_date_idx" ON "events" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_user_id_idx" ON "folders" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_user_id_idx" ON "notes" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_date_idx" ON "tasks" ("due_date");