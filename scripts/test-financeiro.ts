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
  SEM_AUTOMATICOS,
} from "../src/lib/financeiro-calc";
import { extrairValoresMp, vendaDesfeita } from "../src/lib/mp-valores";
import { calcularDre, naturezaDe } from "../src/lib/financeiro-calc";
import { custoDaFicha, custoLinhaExato, formatarCustoExato, parseQuantidade } from "../src/lib/ficha-calc";

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
const r = resumir(socios, movs, { ...SEM_AUTOMATICOS, vendasCents: 100000 });
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
  { ...SEM_AUTOMATICOS, vendasCents: 100000 },
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
  SEM_AUTOMATICOS,
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

console.log("\nPagamento do Mercado Pago virando números do caixa:");
// Cartão aprovado de R$ 219,00 com taxa de R$ 10,93 da loja.
const cartao = extrairValoresMp({
  status: "approved",
  transaction_amount: 219,
  money_release_date: "2026-12-08T10:00:00.000-03:00",
  fee_details: [{ type: "mercadopago_fee", amount: 10.93, fee_payer: "collector" }],
  transaction_details: { net_received_amount: 208.07 },
});
ok("bruto", cartao.brutoCents, 21900);
ok("taxa da loja", cartao.taxaCents, 1093);
ok("líquido", cartao.liquidoCents, 20807);
ok("data de liberação", cartao.liberacao, "2026-12-08T10:00:00.000-03:00");

// Cliente parcelou com juros: o juro é dele, não é custo da loja.
const parcelado = extrairValoresMp({
  status: "approved",
  transaction_amount: 219,
  fee_details: [
    { type: "mercadopago_fee", amount: 10.93, fee_payer: "collector" },
    { type: "financing_fee", amount: 25.4, fee_payer: "payer" },
  ],
  transaction_details: { net_received_amount: 208.07 },
});
ok("juros pagos pelo cliente não viram taxa da loja", parcelado.taxaCents, 1093);

// Pix gerado e não pago: o MP devolve líquido 0, que significa "ainda não".
const pixPendente = extrairValoresMp({
  status: "pending",
  transaction_amount: 219,
  transaction_details: { net_received_amount: 0 },
});
ok("pendente não tem líquido", pixPendente.liquidoCents, null);
ok("pendente não tem taxa", pixPendente.taxaCents, 0);

// Sem detalhe de taxa, mas com líquido: a diferença é a taxa.
ok("taxa deduzida do líquido", extrairValoresMp({ status: "approved", transaction_amount: 100, transaction_details: { net_received_amount: 99.01 } }).taxaCents, 99);
ok("estorno parcial lido", extrairValoresMp({ status: "approved", transaction_amount: 219, transaction_amount_refunded: 50 }).estornadoCents, 5000);
ok("estorno total desfaz a venda", vendaDesfeita("refunded"), true);
ok("contestação perdida desfaz a venda", vendaDesfeita("charged_back"), true);
ok("aprovado não desfaz", vendaDesfeita("approved"), false);

console.log("\nIntegrações entrando no caixa sozinhas:");
const auto = resumir(socios, [], {
  vendasCents: 100000,
  taxasMpCents: 4990,
  estornosCents: 5000,
  etiquetasCents: 2272,
  aLiberarCents: 30000,
});
ok("venda entra", auto.caixa.entradasCents, 100000);
ok("taxa, estorno e etiqueta saem", auto.caixa.saidasCents, 4990 + 5000 + 2272);
ok("saldo", auto.caixa.saldoCents, 100000 - 4990 - 5000 - 2272);
ok("taxa e etiqueta contam como gasto da empresa", auto.despesasTotalCents, 4990 + 2272);
ok("o que falta liberar é informado à parte", auto.caixa.aLiberarCents, 30000);
ok("automático não mexe no capital de ninguém", auto.capitalTotalCents, 0);

console.log("\nResultado do mês (DRE), conferido à mão:");
// Mês de exemplo:
//   vendas R$ 2.000,00, estorno R$ 100,00          -> receita líquida 1.900,00
//   10 peças vendidas a R$ 45,00 de custo           -> CMV 450,00, lucro bruto 1.450,00
//   taxa MP 99,80 + etiquetas 220,00 + embalagem 30 -> variáveis 349,80, margem 1.100,20
//   anúncios 300 + sistemas 50 (fixas) e DAS 82     -> resultado 1.100,20 - 350 - 82 = 668,20
//   comprou estoque 1.500 e a prensa 2.400          -> fora do resultado
const dre = calcularDre({
  vendasCents: 200000,
  receitasAvulsasCents: 0,
  estornosCents: 10000,
  cmvCents: 45000,
  itensSemCusto: 0,
  taxasMpCents: 9980,
  etiquetasCents: 22000,
  despesasPorCategoria: {
    Embalagem: 3000,
    "Marketing e anúncios": 30000,
    "Sistemas e domínio": 5000,
    "Impostos (DAS do MEI)": 8200,
    "Estoque (peças)": 150000,
    Equipamento: 240000,
  },
  metaCents: 300000,
});
ok("receita bruta", dre.receitaBrutaCents, 200000);
ok("receita líquida (menos estorno)", dre.receitaLiquidaCents, 190000);
ok("lucro bruto (menos custo das peças)", dre.lucroBrutoCents, 145000);
ok("despesas variáveis", dre.variaveisCents, 34980);
ok("margem de contribuição", dre.margemContribuicaoCents, 110020);
ok("margem 57,9%", dre.margemPermil, 579);
ok("fixas", dre.fixasCents, 35000);
ok("impostos", dre.impostosCents, 8200);
ok("resultado do mês: R$ 668,20", dre.resultadoCents, 66820);
ok("compra de estoque fica fora", dre.foraDoResultado.estoqueCents, 150000);
ok("prensa fica fora (investimento)", dre.foraDoResultado.investimentoCents, 240000);
// Fixos + DAS = 432,00. Com margem de 1.100,20 sobre 1.900,00, empata em
// 432 x 1900 / 1100,20 = 746,05 (arredonda para cima: empatar exige vender).
ok("ponto de equilíbrio R$ 746,05", dre.pontoEquilibrioCents, 74605);
ok("meta: 66,7% de R$ 3.000", dre.meta?.permil, 667);
ok("sem aviso quando todo custo está preenchido", dre.avisos.length, 0);

const semReceita = calcularDre({
  vendasCents: 0, receitasAvulsasCents: 0, estornosCents: 0, cmvCents: 0, itensSemCusto: 0,
  taxasMpCents: 0, etiquetasCents: 0, despesasPorCategoria: { "Sistemas e domínio": 5000 }, metaCents: null,
});
ok("mês sem venda: prejuízo dos fixos", semReceita.resultadoCents, -5000);
ok("mês sem venda: sem margem", semReceita.margemPermil, null);
ok("mês sem venda: sem ponto de equilíbrio", semReceita.pontoEquilibrioCents, null);
ok("sem meta, sem comparação", semReceita.meta, null);

const margemNegativa = calcularDre({
  vendasCents: 10000, receitasAvulsasCents: 0, estornosCents: 0, cmvCents: 12000, itensSemCusto: 0,
  taxasMpCents: 0, etiquetasCents: 0, despesasPorCategoria: {}, metaCents: null,
});
ok("vendendo abaixo do custo não tem ponto de equilíbrio", margemNegativa.pontoEquilibrioCents, null);

const semCusto = calcularDre({
  vendasCents: 20000, receitasAvulsasCents: 0, estornosCents: 0, cmvCents: 0, itensSemCusto: 3,
  taxasMpCents: 0, etiquetasCents: 0, despesasPorCategoria: {}, metaCents: null,
});
ok("avisa quando falta custo de peça", semCusto.avisos.length, 1);
ok("categoria desconhecida conta como fixa (nunca infla o lucro)", naturezaDe("Categoria velha"), "fixa");

console.log("\nFicha técnica, conferida à mão:");
// Uma peça:
//   peruana lisa: 50 por R$ 1.500,00            -> R$ 30,00 cada        = 3000
//   DTF: R$ 60,00 o metro, usa 0,25 m           -> R$ 15,00             = 1500
//   etiqueta de marca: 1.000 por R$ 35,00        -> 3,5 centavos         = 3,5
//   tag: 100 por R$ 15,00                       -> 15 centavos          = 15
//   ziplock: 100 por R$ 9,90                    -> 9,9 centavos         = 9,9
//   total exato 4.528,4 centavos                 -> R$ 45,28
const etiqueta = { loteValorCents: 3500, loteQuantidadeMil: 1_000_000, quantidadeMil: 1000 };
const ficha = [
  { loteValorCents: 150000, loteQuantidadeMil: 50_000, quantidadeMil: 1000 },
  { loteValorCents: 6000, loteQuantidadeMil: 1000, quantidadeMil: 250 },
  etiqueta,
  { loteValorCents: 1500, loteQuantidadeMil: 100_000, quantidadeMil: 1000 },
  { loteValorCents: 990, loteQuantidadeMil: 100_000, quantidadeMil: 1000 },
];
ok("etiqueta custa 3,5 centavos, sem arredondar", custoLinhaExato(etiqueta), 3.5);
ok("DTF: 0,25 m de R$ 60,00", custoLinhaExato(ficha[1]), 1500);
ok("peça completa: R$ 45,28", custoDaFicha(ficha), 4528);
// Se arredondasse cada insumo: 3000 + 1500 + 4 + 15 + 10 = 4529, um centavo
// a mais por peça, que em 1.000 peças vira R$ 10,00 de lucro sumido.
ok("arredondar insumo por insumo daria errado", ficha.reduce((n, l) => n + Math.round(custoLinhaExato(l)), 0), 4529);
ok("duas etiquetas de 3,5 = 7 centavos exatos", custoDaFicha([etiqueta, etiqueta]), 7);
ok("meio centavo arredonda para cima", custoDaFicha([{ loteValorCents: 5, loteQuantidadeMil: 2000, quantidadeMil: 1000 }]), 3);
ok("ficha vazia custa zero", custoDaFicha([]), 0);
ok("lote sem quantidade não divide por zero", custoDaFicha([{ loteValorCents: 100, loteQuantidadeMil: 0, quantidadeMil: 1000 }]), 0);

console.log("\nQuantidade digitada:");
ok("2,5", parseQuantidade("2,5"), 2500);
ok("0.25 (ponto decimal)", parseQuantidade("0.25"), 250);
ok("0.250 é um quarto, não 250", parseQuantidade("0.250"), 250);
ok("1.000 é mil", parseQuantidade("1.000"), 1_000_000);
ok("3", parseQuantidade("3"), 3000);
ok("zero não é quantidade", parseQuantidade("0"), null);
ok("texto inválido", parseQuantidade("abc"), null);
ok("valor 0.250 em reais é recusado, não vira R$ 250", parseReais("0.250"), null);
ok("valor 1.500 em reais é mil e quinhentos", parseReais("1.500"), 150000);

console.log("\nCusto exato na tela:");
ok("3,5 centavos", formatarCustoExato(3.5), "3,5 centavos");
ok("15 centavos", formatarCustoExato(15), "15 centavos");
ok("R$ 30,00", formatarCustoExato(3000), "R$ 30,00");
ok("R$ 1,005", formatarCustoExato(100.5), "R$ 1,005");

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
