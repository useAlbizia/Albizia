CREATE TABLE "regras_prazo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"tipo" text NOT NULL,
	"uf" text DEFAULT '' NOT NULL,
	"cep_inicio" text DEFAULT '' NOT NULL,
	"cep_fim" text DEFAULT '' NOT NULL,
	"dias_extra" integer DEFAULT 1 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retirada_config" (
	"id" text PRIMARY KEY DEFAULT 'config' NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"instrucoes" text DEFAULT '' NOT NULL,
	"prazo_dias" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "regras_prazo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "retirada_config" ENABLE ROW LEVEL SECURITY;
