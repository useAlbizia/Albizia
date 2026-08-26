ALTER TABLE "site_settings" ADD COLUMN "shipping_method" text DEFAULT 'flat' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_token" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_cep" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_weight_grams" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_length_cm" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_width_cm" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_height_cm" integer DEFAULT 4 NOT NULL;