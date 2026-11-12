CREATE TABLE "campanhas_frete" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"inicio" date,
	"fim" date,
	"tipo" text NOT NULL,
	"ufs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cep_inicio" text DEFAULT '' NOT NULL,
	"cep_fim" text DEFAULT '' NOT NULL,
	"acao" text NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL,
	"minimo_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "campanhas_frete" ENABLE ROW LEVEL SECURITY;
