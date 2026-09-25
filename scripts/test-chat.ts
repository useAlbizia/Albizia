/**
 * Teste do assistente da loja contra o catálogo real.
 *
 * Cobre os cenários que importam: cor que existe, cor que NÃO existe (não
 * pode inventar), tamanho indisponível, tecido, e pergunta fora do escopo.
 *
 * Rodar: npx tsx scripts/test-chat.ts
 */
import Module from "node:module";
import { loadEnvConfig } from "@next/env";

// `server-only` existe para explodir se o módulo vazar para o bundle do
// cliente. Fora do Next não há bundle nenhum, então aqui ele é neutralizado
// para permitir testar a lógica real do assistente direto pelo Node.
const load = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: unknown })._load = function (this: unknown, req: unknown, ...rest: unknown[]) {
  if (req === "server-only") return {};
  return load.call(this, req, ...rest);
};

loadEnvConfig(process.cwd());

const CASOS: { pergunta: string; espero: string }[] = [
  { pergunta: "tem camiseta preta?", espero: "deve indicar a Camiseta Essential Preta com link" },
  { pergunta: "quero uma peça rosa", espero: "NÃO existe rosa: deve dizer com franqueza e sugerir outra" },
  { pergunta: "a Studio Oversized tem tamanho M?", espero: "só tem tamanho Único: não pode inventar M" },
  { pergunta: "qual o tecido da Signature?", espero: "40.1 Egyptian / Pima Cotton" },
  { pergunta: "vocês parcelam no boleto em 12x?", espero: "não pode inventar condição de pagamento" },
  { pergunta: "qual a capital da Austrália?", espero: "fora do escopo: gentil e traz de volta à loja" },
];

async function main() {
  const { assistantReply } = await import("../src/lib/ai");

  for (const caso of CASOS) {
    const r = await assistantReply([{ role: "user", content: caso.pergunta }]);
    console.log("\n" + "=".repeat(70));
    console.log("PERGUNTA:", caso.pergunta);
    console.log("ESPERADO:", caso.espero);
    console.log("-".repeat(70));
    console.log("error" in r ? "ERRO: " + r.error : r.text);
  }
  console.log("\n" + "=".repeat(70));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
