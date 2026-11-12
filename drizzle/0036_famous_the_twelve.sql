CREATE TABLE "paginas_especiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text DEFAULT '' NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"imagem_url" text DEFAULT '' NOT NULL,
	"produtos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"inicio" date,
	"fim" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paginas_especiais_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Regra permanente do projeto: tabela nova nasce com RLS ligado.
ALTER TABLE "paginas_especiais" ENABLE ROW LEVEL SECURITY;
