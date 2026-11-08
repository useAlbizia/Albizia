CREATE TABLE "lancamento_pagadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lancamento_id" uuid NOT NULL,
	"socio_id" uuid,
	"valor_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" date NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text DEFAULT '' NOT NULL,
	"fornecedor" text DEFAULT '' NOT NULL,
	"forma_pagamento" text DEFAULT '' NOT NULL,
	"valor_cents" integer NOT NULL,
	"status" text DEFAULT 'pago' NOT NULL,
	"grupo_id" uuid,
	"parcela_num" integer,
	"parcela_total" integer,
	"socio_id" uuid,
	"origem" text DEFAULT 'painel' NOT NULL,
	"criado_por" text DEFAULT '' NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"telegram_id" text DEFAULT '' NOT NULL,
	"cotas" integer DEFAULT 1 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lancamento_pagadores" ADD CONSTRAINT "lancamento_pagadores_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento_pagadores" ADD CONSTRAINT "lancamento_pagadores_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Regra permanente do projeto: toda tabela nova nasce com RLS ligado. Sem
-- isso, a chave anon (pública, vai no JavaScript do site) leria pela API do
-- Supabase os lançamentos e o capital de cada sócio. O app não é afetado:
-- ele fala com o Postgres pelo Drizzle como dono das tabelas.
ALTER TABLE "socios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lancamentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lancamento_pagadores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "lancamentos_data_idx" ON "lancamentos" ("data");--> statement-breakpoint
CREATE INDEX "lancamentos_grupo_idx" ON "lancamentos" ("grupo_id");--> statement-breakpoint
CREATE INDEX "lancamento_pagadores_lancamento_idx" ON "lancamento_pagadores" ("lancamento_id");--> statement-breakpoint
-- Os três sócios, em partes iguais (1 cota cada). Só os nomes: e-mail e
-- telefone são preenchidos pelo painel, para dado pessoal não ir parar no
-- repositório.
INSERT INTO "socios" ("nome", "cotas") VALUES
  ('Nilson Brites', 1),
  ('Jair Rodrigues', 1),
  ('David Bonfim', 1);