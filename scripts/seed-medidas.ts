/**
 * Preenche peso e medida de embalagem nos produtos que ainda estão em branco.
 *
 * São valores COMUNS de mercado, não medidos. Servem para o frete sair certo
 * no teste e para a loja poder abrir; depois é só corrigir no painel, produto
 * por produto, quando a balança e a fita métrica disserem o número real.
 *
 * Só toca em produto com medida zerada, então rodar duas vezes não desfaz
 * nada que alguém já ajustou à mão.
 *
 * Rodar (depois da migração 0021): npx tsx scripts/seed-medidas.ts
 */
import { eq, and, or } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { products, siteSettings } from "../src/lib/db/schema";

// Camiseta dobrada num ziplock, dentro do saco coex. Short de praia é mais
// leve e mais compacto, mas o tecido encorpado deixa o pacote um dedo mais
// alto. Os dois passam folgado do mínimo dos Correios (13 x 8 x 1 cm).
const PADRAO: Record<string, { peso: number; c: number; l: number; a: number }> = {
  camiseta: { peso: 220, c: 30, l: 24, a: 3 },
  "moda-praia": { peso: 190, c: 28, l: 22, a: 4 },
};

const FALLBACK = PADRAO.camiseta;

async function main() {
  const todos = await db.query.products.findMany({
    columns: { id: true, name: true, category: true, weightGrams: true, lengthCm: true, widthCm: true, heightCm: true },
  });

  let mexidos = 0;
  for (const p of todos) {
    const vazio = !p.weightGrams || !p.lengthCm || !p.widthCm || !p.heightCm;
    if (!vazio) {
      console.log(`  pula   ${p.name} (já tem medida)`);
      continue;
    }
    const m = PADRAO[p.category] ?? FALLBACK;
    await db
      .update(products)
      .set({ weightGrams: m.peso, lengthCm: m.c, widthCm: m.l, heightCm: m.a })
      .where(eq(products.id, p.id));
    console.log(`  ok     ${p.name}: ${m.peso}g, ${m.c}x${m.l}x${m.a} cm`);
    mexidos++;
  }

  // O pacote padrão global é a reserva para produto sem medida. Deixar ele
  // igual ao da camiseta evita que um produto novo caia numa caixa de 20x20x4
  // que não existe em lugar nenhum.
  await db
    .update(siteSettings)
    .set({
      meWeightGrams: FALLBACK.peso,
      meLengthCm: FALLBACK.c,
      meWidthCm: FALLBACK.l,
      meHeightCm: FALLBACK.a,
    })
    .where(
      and(
        eq(siteSettings.id, 1),
        // Só sobrescreve se ainda estiver no default de fábrica, para não
        // apagar um ajuste que alguém fez de propósito no painel.
        or(eq(siteSettings.meWeightGrams, 300), eq(siteSettings.meWeightGrams, 0)),
      ),
    );

  console.log(`\n${mexidos} produto(s) preenchido(s) de ${todos.length}.`);
  console.log("Confira e corrija em Admin → Produtos, campo \"Peça embalada\".\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
