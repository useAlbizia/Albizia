CREATE TABLE "guias_tamanho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"colunas" jsonb NOT NULL,
	"linhas" jsonb NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produto_guia" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"guia_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "produto_guia" ADD CONSTRAINT "produto_guia_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_guia" ADD CONSTRAINT "produto_guia_guia_id_guias_tamanho_id_fk" FOREIGN KEY ("guia_id") REFERENCES "public"."guias_tamanho"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "guias_tamanho" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "produto_guia" ENABLE ROW LEVEL SECURITY;
