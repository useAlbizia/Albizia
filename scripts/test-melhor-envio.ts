/**
 * Sonda a conexão com o Melhor Envio e diz o que ainda falta.
 *
 * Fala com a API direto, sem passar por lib/shipping.ts, de propósito: se
 * houver bug no meu módulo, este teste ainda conta a verdade sobre o token.
 *
 * Nada aqui gasta dinheiro. Cotar é de graça e não cria envio nenhum.
 *
 * Rodar: npx tsx scripts/test-melhor-envio.ts
 */
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { siteSettings } from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

const HOSTS = {
  production: "https://www.melhorenvio.com.br",
  sandbox: "https://sandbox.melhorenvio.com.br",
};
const UA = "ALBIZIA (contato@usealbizia.com.br)";

// CEPs reais e distantes, para a cotação devolver mais de uma opção:
// São Paulo capital e Porto Alegre.
const CEP_TESTE_DESTINO = "90010150";

function mascara(t: string): string {
  // Nunca imprimir o token. Só o suficiente para conferir que é o certo.
  if (t.length < 12) return "(curto demais, suspeito)";
  return `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} caracteres)`;
}

async function main() {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });

  const env = row?.meEnvironment === "sandbox" ? "sandbox" : "production";
  const doAmbiente = env === "sandbox"
    ? process.env.TOKEN_MELHOR_ENVIOS_SANDBOX
    : process.env.TOKEN_MELHOR_ENVIOS;
  const doBanco = env === "sandbox" ? row?.meTokenSandbox : row?.meToken;
  const token = (doAmbiente || doBanco || "").trim();

  console.log(`\nAmbiente: ${env}`);
  console.log(`Origem do token: ${doAmbiente ? "variável de ambiente" : doBanco ? "banco de dados" : "NENHUM"}`);
  if (!token) {
    console.log("\nSem token. Ponha TOKEN_MELHOR_ENVIOS no .env.local (e na Vercel).\n");
    process.exit(1);
  }
  console.log(`Token: ${mascara(token)}`);

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": UA,
  };

  // 1. De quem é a conta.
  console.log("\n1. Conferindo de quem é o token...");
  const me = await fetch(`${HOSTS[env]}/api/v2/me`, { headers });
  if (!me.ok) {
    const corpo = await me.text().catch(() => "");
    console.log(`   FALHOU  HTTP ${me.status}`);
    console.log(`   ${corpo.slice(0, 300)}`);
    if (me.status === 401) {
      console.log("\n   Token inválido ou expirado, ou é de outro ambiente.");
      console.log("   Token de sandbox não funciona em produção e vice-versa.\n");
    }
    process.exit(1);
  }
  const conta = (await me.json()) as { firstname?: string; lastname?: string; email?: string; id?: number };
  console.log(`   ok      ${[conta.firstname, conta.lastname].filter(Boolean).join(" ")} <${conta.email}>`);
  console.log(`           conta nº ${conta.id}`);

  // 2. Cotação real.
  const origem = (row?.meFromCep ?? "").replace(/\D/g, "");
  console.log(`\n2. Cotando frete de ${origem || "(SEM CEP DE ORIGEM)"} para ${CEP_TESTE_DESTINO}...`);
  if (origem.length !== 8) {
    console.log("   PULADO  Falta o CEP de origem em Admin → Entrega e frete.");
  } else {
    const cot = await fetch(`${HOSTS[env]}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: { postal_code: origem },
        to: { postal_code: CEP_TESTE_DESTINO },
        package: { weight: 0.22, width: 24, height: 3, length: 30 },
        options: { receipt: false, own_hand: false, insurance_value: 89.9 },
      }),
    });
    if (!cot.ok) {
      console.log(`   FALHOU  HTTP ${cot.status}`);
      console.log(`   ${(await cot.text().catch(() => "")).slice(0, 300)}`);
    } else {
      const opcoes = (await cot.json()) as Array<{
        name?: string; price?: string; delivery_time?: number;
        company?: { name?: string }; error?: string;
      }>;
      const validas = opcoes.filter((o) => !o.error && o.price);
      if (validas.length === 0) {
        console.log("   Nenhuma opção. Motivos devolvidos pelo Melhor Envio:");
        for (const o of opcoes) console.log(`     - ${o.company?.name} ${o.name}: ${o.error}`);
      } else {
        for (const o of validas) {
          console.log(`   ok      ${o.company?.name} ${o.name}: R$ ${o.price} em ${o.delivery_time} dia(s)`);
        }
      }
    }
  }

  // 3. O que falta para COMPRAR etiqueta (a cotação não precisa disso).
  console.log("\n3. Conferindo o que falta para emitir etiqueta...");
  const falta: string[] = [];
  if (!row?.meFromName) falta.push("nome do remetente");
  if (!(row?.meFromDocument ?? "").replace(/\D/g, "")) falta.push("CNPJ do remetente");
  if (!row?.meFromPhone) falta.push("telefone do remetente");
  if (!row?.meFromAddress) falta.push("rua do remetente");
  if (!row?.meFromNumber) falta.push("número do remetente");
  if (!row?.meFromDistrict) falta.push("bairro do remetente");
  if (!row?.meFromCity) falta.push("cidade do remetente");
  if (!row?.meFromState) falta.push("UF do remetente");
  if (origem.length !== 8) falta.push("CEP de origem");

  if (falta.length === 0) {
    console.log("   ok      Nada falta. Dá para emitir etiqueta.");
  } else {
    console.log(`   Faltam ${falta.length} campo(s), todos em Admin → Entrega e frete:`);
    for (const f of falta) console.log(`     - ${f}`);
  }

  console.log("");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
