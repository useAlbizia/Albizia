CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"path" text,
	"product_slug" text,
	"session_id" text,
	"value_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
