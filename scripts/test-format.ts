/**
 * Testa a formatação de datas.
 *
 * O bug que originou isto: o painel mostrou "Última sessão 26/09/2026, 13:38"
 * quando no Brasil eram 10:39. O servidor da Vercel roda em UTC e as datas
 * eram formatadas lá, então o painel mostrava horário de Londres, três horas
 * no futuro. Data no futuro faz duvidar de tudo que a tela diz.
 *
 * Por isso este arquivo roda com TZ=UTC de propósito: é o fuso do servidor de
 * produção, e é exatamente onde o bug aparecia. Se o fuso deixar de estar
 * fixado no código, estes testes quebram aqui e não na frente do cliente.
 *
 * Rodar: npx tsx scripts/test-format.ts
 */
process.env.TZ = "UTC";

import { brl, dateTime, isoDay, longDate, shortDate } from "../src/lib/format";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = real === esperado;
  if (!passou) falhas++;
  console.log(
    `${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `  (esperava ${esperado}, veio ${real})`}`,
  );
}

// 26/09/2026 13:38 em UTC = 10:38 em Brasília. É o caso exato do bug.
const oCaso = new Date("2026-09-26T13:38:00Z");

console.log("\nO horário mostrado é o de Brasília, não o do servidor:");
ok("13:38 UTC vira 10:38", dateTime(oCaso), "26/09/2026, 10:38");
ok("mesma data", shortDate(oCaso), "26/09/2026");

console.log("\nA virada do dia acontece à meia-noite de Brasília, não de Londres:");
// 00:30 UTC do dia 27 ainda é 21:30 do dia 26 no Brasil.
const depoisDaMeiaNoiteEmLondres = new Date("2026-09-27T00:30:00Z");
ok("ainda é dia 26", shortDate(depoisDaMeiaNoiteEmLondres), "26/09/2026");
ok("e são 21:30", dateTime(depoisDaMeiaNoiteEmLondres), "26/09/2026, 21:30");
ok("chave de dia acompanha", isoDay(depoisDaMeiaNoiteEmLondres), "2026-09-26");

// 03:00 UTC já é meia-noite em Brasília: aí sim virou o dia.
const meiaNoiteNoBrasil = new Date("2026-09-27T03:00:00Z");
ok("às 3h UTC já é dia 27", shortDate(meiaNoiteNoBrasil), "27/09/2026");
ok("chave de dia também virou", isoDay(meiaNoiteNoBrasil), "2026-09-27");

console.log("\nChave de dia (é o que casa com o agrupamento do banco):");
ok("formato ISO", isoDay(new Date("2026-01-05T15:00:00Z")), "2026-01-05");
ok("aceita milissegundos", isoDay(Date.UTC(2026, 8, 26, 15, 0)), "2026-09-26");
ok("aceita string", isoDay("2026-12-31T23:00:00Z"), "2026-12-31");
// 23h UTC de 31/12 é 20h de 31/12 no Brasil: o ano ainda não virou aqui.
ok("não adianta o ano", isoDay("2027-01-01T02:00:00Z"), "2026-12-31");

console.log("\nData por extenso:");
ok("mês escrito", longDate(oCaso), "26 de setembro de 2026");

console.log("\nDinheiro (não mexemos, mas não pode ter quebrado):");
// O separador entre "R$" e o número é espaço fixo, para o valor nunca quebrar
// em duas linhas. Normalizar aqui evita um teste que falha por um caractere
// invisível enquanto a tela está perfeita.
const semEspacoFixo = (s: string) => s.replace(/[  ]/g, " ");
ok("centavos viram reais", semEspacoFixo(brl(21900)), "R$ 219,00");
ok("zero", semEspacoFixo(brl(0)), "R$ 0,00");

console.log(falhas === 0 ? "\nTodos passaram.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
