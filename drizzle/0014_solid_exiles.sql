ALTER TABLE "site_settings" ADD COLUMN "mp_public_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "mp_access_token" text DEFAULT '' NOT NULL;