ALTER TABLE "site_settings" ADD COLUMN "recovery_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "recovery_high_value_cents" integer DEFAULT 50000 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "recovery_alert_email" text DEFAULT '' NOT NULL;