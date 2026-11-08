/**
 * Testa as contas do livro caixa e do capital dos sócios.
 *
 * Dinheiro dos sócios é o lugar onde um erro de centavo vira desconfiança
 * entre pessoas, então cada regra tem um teste com números conferidos à mão.
 *
 * Rodar: npx tsx scripts/test-financeiro.ts
 */
import {
  acertos,
  dividirIgual,
  dividirPorPeso,
  gerarParcelas,
  limiteMeiCents,
  parseReais,
  resumir,
  somarMeses,
  type Movimento,
  type SocioBase,
} from "../src/lib/financeiro-calc";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  const passou = a === b;
  if (!passou) falhas++;
  console.log(`${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `\n          esperava ${b}\n          veio     ${a}`}`);
}

console.log("\nDivisão sem perder centavo:");
ok("R$ 1,00 em 3", dividirIgual(100, 3), [34, 33, 33]);
ok("soma sempre bate", dividirIgual(240000, 7).reduce((a, b) => a + b, 0), 240000);
ok("por cotas iguais", dividirPorPeso(100, [1, 1, 1]), [34, 33, 33]);
ok("por cotas 2:1", dividirPorPeso(300, [2, 1]), [200, 100]);
ok("tudo zero", dividirPorPeso(0, [1, 1, 1]), [0, 0, 0]);

console.log("\nMeses (vencimento de parcela):");
ok("dia normal", somarMeses("2026-07-10", 1), "2026-08-10");
ok("31 de janeiro vira 28 de fevereiro", somarMeses("2026-01-31", 1), "2026-02-28");
ok("ano bissexto: 29", somarMeses("2028-01-31", 1), "2028-02-29");
ok("vira o ano", somarMeses("2026-11-15", 3), "2027-02-15");

console.log("\nParcelas da prensa (R$ 2.400 em 12x desde julho, hoje 08/11):");
const parcelas = gerarParcelas(240000, 12, "2026-07-10", "2026-11-08");
ok("12 parcelas", parcelas.length, 12);
ok("R$ 200 cada", parcelas.every((p) => p.valorCents === 20000), true);
ok("jul, ago, set, out pagas", parcelas.filter((p) => p.status === "pago").map((p) => p.data), [
  "2026-07-10",
  "2026-08-10",
  "2026-09-10",
  "2026-10-10",
]);
ok("novembro em diante previstas", parcelas.filter((p) => p.status === "previsto").length, 8);
ok("valor quebrado soma certo", gerarParcelas(100000, 3, "2026-01-01", "2026-01-01").map((p) => p.valorCents), [33334, 33333, 33333]);

// ── O cenário ────────────────────────────────────────────────────────────
const N = "n";
const J = "j";
const D = "d";
const socios: SocioBase[] = [
  { id: N, nome: "Nilson", cotas: 1, ativo: true },
  { id: J, nome: "Jair", cotas: 1, ativo: true },
  { id: D, nome: "David", cotas: 1, ativo: true },
];

const movs: Movimento[] = [
  // David comprou as camisetas: R$ 3.000 do bolso dele.
  { tipo: "despesa", status: "pago", valorCents: 300000, socioId: null, pagadores: [{ socioId: D, valorCents: 300000 }] },
  // Prensa: 4 parcelas pagas de R$ 200, cada uma dividida entre os três.
  ...parcelas.map((p) => ({
    tipo: "despesa" as const,
    status: p.status,
    valorCents: p.valorCents,
    socioId: null,
    pagadores: dividirIgual(p.valorCents, 3).map((v, i) => ({ socioId: [N, J, D][i], valorCents: v })),
  })),
  // Jair fez um Pix de R$ 500 para a conta da empresa.
  { tipo: "aporte", status: "pago", valorCents: 50000, socioId: J, pagadores: [] },
  // A empresa pagou o DAS do MEI (R$ 82) com o caixa.
  { tipo: "despesa", status: "pago", valorCents: 8200, socioId: null, pagadores: [{ socioId: null, valorCents: 8200 }] },
];

// Vendas pagas no site: R$ 1.000.
const r = resumir(socios, movs, 100000);
const s = (id: string) => r.socios.find((x) => x.id === id)!;

console.log("\nCapital de cada sócio (só o que foi pago):");
// Prensa paga: 4 x R$ 200,00. Cada parcela de 20000 centavos vira
// 6667 + 6667 + 6666 (o centavo que sobra vai para os primeiros), então
// em 4 parcelas: Nilson 26668, Jair 26668, David 26664.
ok("Nilson: 4 parcelas da prensa", s(N).capitalCents, 26668);
ok("Jair: parcelas + Pix de 500", s(J).capitalCents, 26668 + 50000);
ok("David: camisetas + parcelas", s(D).capitalCents, 300000 + 26664);
ok("capital total", r.capitalTotalCents, 26668 + 76668 + 326664);

console.log("\nEquilíbrio (parte justa = total / 3):");
const total = r.capitalTotalCents; // 430.000
ok("parte justa de cada um soma o total", r.socios.reduce((n, l) => n + l.parteJustaCents, 0), total);
ok("diferenças somam zero", r.socios.reduce((n, l) => n + l.diferencaCents, 0), 0);
ok("David tem a receber", s(D).diferencaCents > 0, true);
ok("Nilson e Jair abaixo", s(N).diferencaCents < 0 && s(J).diferencaCents < 0, true);

console.log("\nAcertos para zerar a diferença:");
const ac = acertos(r.socios);
ok("todo acerto vai para o David", ac.every((a) => a.paraId === D), true);
ok("acertos cobrem exatamente o que o David tem a receber", ac.reduce((n, a) => n + a.valorCents, 0), s(D).diferencaCents);
ok("no máximo dois acertos", ac.length <= 2, true);

console.log("\nCaixa da empresa:");
// Entradas: vendas 1.000 + aporte do Jair 500. Saídas: DAS 82.
ok("entradas", r.caixa.entradasCents, 150000);
ok("saídas (só o que a empresa pagou)", r.caixa.saidasCents, 8200);
ok("saldo", r.caixa.saldoCents, 141800);
ok("despesa paga por sócio NÃO sai do caixa", r.caixa.despesasEmpresaCents, 8200);
ok("mas conta como gasto da empresa", r.despesasTotalCents, 300000 + 80000 + 8200);

console.log("\nParcelas previstas não mexem em saldo:");
ok("8 parcelas futuras de R$ 200", r.previsto.totalCents, 160000);
ok("e cada sócio sabe quanto ainda vai pagar", s(N).previstoCents + s(J).previstoCents + s(D).previstoCents, 160000);

console.log("\nDevolução e distribuição:");
const r2 = resumir(
  socios,
  [
    ...movs,
    { tipo: "devolucao_aporte", status: "pago", valorCents: 100000, socioId: D, pagadores: [] },
    { tipo: "distribuicao_lucro", status: "pago", valorCents: 10000, socioId: N, pagadores: [] },
  ],
  100000,
);
const s2 = (id: string) => r2.socios.find((x) => x.id === id)!;
ok("devolução diminui o capital do David", s2(D).capitalCents, 326664 - 100000);
ok("devolução sai do caixa", r2.caixa.saldoCents, 141800 - 100000 - 10000);
ok("distribuição NÃO mexe no capital", s2(N).capitalCents, 26668);
ok("distribuição fica registrada", s2(N).lucroRecebidoCents, 10000);

console.log("\nSócio inativo sai da divisão, mas não da história:");
const r3 = resumir(
  [...socios.slice(0, 2), { id: D, nome: "David", cotas: 1, ativo: false }],
  movs,
  0,
);
const s3 = (id: string) => r3.socios.find((x) => x.id === id)!;
ok("capital dele continua registrado", s3(D).capitalCents, 326664);
ok("parte justa dele vira zero", s3(D).parteJustaCents, 0);

console.log("\nLimite do MEI:");
ok("2026", limiteMeiCents(2026), 8100000);
ok("2027", limiteMeiCents(2027), 11000000);
ok("2028 em diante", limiteMeiCents(2030), 14000000);

console.log("\nValor digitado em reais:");
ok("1.234,56", parseReais("1.234,56"), 123456);
ok("1234,56", parseReais("1234,56"), 123456);
ok("1234.56", parseReais("1234.56"), 123456);
ok("R$ 89,9", parseReais("R$ 89,9"), 8990);
ok("89", parseReais("89"), 8900);
ok("1.234 sem vírgula é mil e duzentos", parseReais("1.234"), 123400);
ok("2.400.000,00", parseReais("2.400.000,00"), 240000000);
ok("texto inválido", parseReais("abc"), null);
ok("vazio", parseReais(""), null);
ok("três casas decimais não adivinha", parseReais("10,555"), null);

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
