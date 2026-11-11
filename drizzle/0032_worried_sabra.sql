CREATE TABLE "erros_sistema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"origem" text NOT NULL,
	"tipo" text DEFAULT '' NOT NULL,
	"caminho" text DEFAULT '' NOT NULL,
	"mensagem" text NOT NULL,
	"detalhe" text DEFAULT '' NOT NULL,
	"codigo" text DEFAULT '' NOT NULL,
	"usuario" text DEFAULT '' NOT NULL,
	"aparelho" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "erros_sistema_criado_em_idx" ON "erros_sistema" ("criado_em" DESC);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "erros_sistema" ENABLE ROW LEVEL SECURITY;
