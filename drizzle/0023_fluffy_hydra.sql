ALTER TABLE "site_settings" ADD COLUMN "intro_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "brand_slide_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "brand_slide_position" text DEFAULT 'last' NOT NULL;