-- Liga Row Level Security em todas as tabelas do schema public.
--
-- POR QUE: o Supabase expoe o schema `public` pela API REST (PostgREST), e a
-- chave `anon` e publica por natureza (ela vai no bundle JavaScript do site).
-- Sem RLS, qualquer pessoa que copie essa chave do codigo-fonte le as tabelas
-- inteiras. A auditoria mostrou leitura liberada de site_settings (que guarda
-- me_token e mp_access_token), orders (PII de cliente), coupons e audit_log.
--
-- POR QUE ISSO NAO QUEBRA O SITE: a aplicacao nao usa PostgREST. Ela fala com
-- o Postgres direto via Drizzle, com a DATABASE_URL, no papel dono das tabelas.
-- O dono da tabela ignora RLS por padrao (so FORCE ROW LEVEL SECURITY mudaria
-- isso, e nao estamos usando). Entao o servidor continua lendo e escrevendo
-- normalmente, e apenas o acesso externo pela chave publica passa a ser negado.
--
-- POR QUE NAO CRIAMOS POLICIES: RLS ligado e sem policy nenhuma significa
-- "nega tudo" para anon e authenticated. E exatamente o que queremos: nenhuma
-- dessas tabelas precisa ser lida pelo navegador. Se um dia alguma precisar,
-- a policy deve ser criada de proposito, tabela por tabela, nunca por atacado.

ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."legal_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."menu_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;
