CREATE TABLE "lancamento_aprovacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" uuid NOT NULL,
	"socio_id" uuid NOT NULL,
	"decisao" text NOT NULL,
	"comentario" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aprovacao_chave_socio" UNIQUE("chave","socio_id")
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "criado_por_socio_id" uuid;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "aprovacao" text DEFAULT 'aprovado' NOT NULL;--> statement-breakpoint
ALTER TABLE "lancamento_aprovacoes" ADD CONSTRAINT "lancamento_aprovacoes_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_criado_por_socio_id_socios_id_fk" FOREIGN KEY ("criado_por_socio_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "lancamento_aprovacoes" ENABLE ROW LEVEL SECURITY;