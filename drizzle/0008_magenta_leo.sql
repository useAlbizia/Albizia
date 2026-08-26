ALTER TABLE "products" ADD COLUMN "color_group" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "color_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "color_hex" text DEFAULT '' NOT NULL;