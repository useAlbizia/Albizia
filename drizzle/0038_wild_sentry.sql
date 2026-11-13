ALTER TABLE "erros_sistema" ADD COLUMN "gravidade" text DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE "erros_sistema" ADD COLUMN "area" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "erros_sistema" ADD COLUMN "chave" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "erros_sistema" ADD COLUMN "notificado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "erros_sistema" ADD COLUMN "resolvido" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erros_sistema_chave_idx" ON "erros_sistema" ("chave", "criado_em" DESC);
