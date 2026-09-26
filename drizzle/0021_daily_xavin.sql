ALTER TABLE "orders" ADD COLUMN "me_service_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_service_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_company" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_label_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_label_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "me_labeled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight_grams" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length_cm" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width_cm" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height_cm" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_environment" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_token_sandbox" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_document" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_complement" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_district" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "me_from_state" text DEFAULT '' NOT NULL;