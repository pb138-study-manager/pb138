ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en' NOT NULL;
