CREATE TABLE "metas_mensais" (
	"mes" text PRIMARY KEY NOT NULL,
	"vendas_cents" integer DEFAULT 0 NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_net_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_release_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custo_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado, para a
-- chave pública do site não ler as metas pela API do Supabase.
ALTER TABLE "metas_mensais" ENABLE ROW LEVEL SECURITY;