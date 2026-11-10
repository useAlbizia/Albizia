ALTER TABLE "lancamento_pagadores" ADD COLUMN "pago_em" date;--> statement-breakpoint
ALTER TABLE "lancamento_pagadores" ADD COLUMN "pago_marcado_por" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- O que já estava pago passa a ter a data de pagamento de cada parte: a do
-- próprio lançamento. Parcela futura fica sem data, esperando o botão Pagar.
UPDATE "lancamento_pagadores" p SET "pago_em" = l."data", "pago_marcado_por" = 'migração'
FROM "lancamentos" l WHERE l."id" = p."lancamento_id" AND l."status" = 'pago';
