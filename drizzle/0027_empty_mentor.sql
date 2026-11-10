CREATE TABLE "email_mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direcao" text NOT NULL,
	"resend_id" text,
	"message_id" text,
	"in_reply_to" text,
	"de_email" text NOT NULL,
	"de_nome" text,
	"para_email" text NOT NULL,
	"assunto" text DEFAULT '' NOT NULL,
	"texto" text,
	"html" text,
	"anexos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lido" boolean DEFAULT false NOT NULL,
	"importante" boolean DEFAULT false NOT NULL,
	"arquivado" boolean DEFAULT false NOT NULL,
	"spam" boolean DEFAULT false NOT NULL,
	"excluido_em" timestamp with time zone,
	"enviado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_mensagens_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado. E-mail de
-- cliente é dado pessoal; a chave pública do site não pode ler esta caixa.
ALTER TABLE "email_mensagens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "email_mensagens_created_idx" ON "email_mensagens" ("created_at" DESC);
