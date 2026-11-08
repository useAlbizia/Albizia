CREATE TABLE "ficha_tecnica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"insumo_id" uuid NOT NULL,
	"quantidade_mil" integer NOT NULL,
	CONSTRAINT "ficha_produto_insumo" UNIQUE("product_id","insumo_id")
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'outro' NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"lote_valor_cents" integer DEFAULT 0 NOT NULL,
	"lote_quantidade_mil" integer DEFAULT 1000 NOT NULL,
	"fornecedor" text DEFAULT '' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "embalagem_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado. Custo de
-- insumo e receita de cada peça são segredo comercial; a chave pública do
-- site não pode ler.
ALTER TABLE "insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ficha_tecnica" ENABLE ROW LEVEL SECURITY;