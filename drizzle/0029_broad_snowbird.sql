CREATE TABLE "motivacao" (
	"id" text PRIMARY KEY DEFAULT 'config' NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"frequencia" text DEFAULT 'diaria' NOT NULL,
	"proxima" integer DEFAULT 0 NOT NULL,
	"ultimo_envio" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "motivacao" ENABLE ROW LEVEL SECURITY;
