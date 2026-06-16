CREATE TABLE IF NOT EXISTS "user_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service" text NOT NULL,
	"connected" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp,
	CONSTRAINT "user_integrations_user_service_unique" UNIQUE("user_id","service")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
