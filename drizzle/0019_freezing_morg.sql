ALTER TABLE "orders" ADD COLUMN "customer_document" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ncm" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "store_uf" text DEFAULT '' NOT NULL;