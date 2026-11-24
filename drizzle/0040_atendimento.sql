CREATE TABLE "chamados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" serial NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"pedido_numero" integer,
	"motivo" text NOT NULL,
	"mensagem" text NOT NULL,
	"conversa" text DEFAULT '' NOT NULL,
	"origem" text DEFAULT 'site' NOT NULL,
	"status" text DEFAULT 'aberto' NOT NULL,
	"prazo_em" timestamp with time zone NOT NULL,
	"resolvido_em" timestamp with time zone,
	"historico" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chamados_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "limites_uso" (
	"chave" text NOT NULL,
	"janela" timestamp with time zone NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "limites_uso_chave_janela_pk" PRIMARY KEY("chave","janela")
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "atendimento_prazo_dias" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "chamados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "limites_uso" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER SEQUENCE "chamados_numero_seq" RESTART WITH 1001;
