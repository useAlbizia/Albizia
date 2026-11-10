CREATE TABLE "push_inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"aparelho" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_inscricoes_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "push_inscricoes" ENABLE ROW LEVEL SECURITY;
