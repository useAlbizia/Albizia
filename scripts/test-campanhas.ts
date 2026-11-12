// Regras das campanhas de frete por região (src/lib/campanhas.ts).
// Rodar: npx tsx scripts/test-campanhas.ts
import { aplicarCampanhas, type Campanha } from "../src/lib/campanhas";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = JSON.stringify(real) === JSON.stringify(esperado);
  if (!passou) falhas++;
  console.log(`  ${passou ? "ok  " : "FALHOU"}  ${nome}${passou ? "" : ` (veio ${JSON.stringify(real)}, esperado ${JSON.stringify(esperado)})`}`);
}
const base: Campanha = { nome: "", ativo: true, inicio: null, fim: null, tipo: "uf", ufs: [], cepInicio: "", cepFim: "", acao: "gratis", valor: 0, minimoCents: 0 };
const c = (x: Partial<Campanha>): Campanha => ({ ...base, ...x });
const SP = "01310-100";
const RJ = "20040-002";
const HOJE = "2026-11-12";

ok("sem campanha: preço igual", aplicarCampanhas(2000, SP, 10000, [], HOJE), { precoCents: 2000, campanha: null });
ok("frete grátis SP", aplicarCampanhas(2000, SP, 10000, [c({ nome: "Grátis SP", ufs: ["SP"] })], HOJE), { precoCents: 0, campanha: "Grátis SP" });
ok("frete grátis SP não vale no RJ", aplicarCampanhas(2000, RJ, 10000, [c({ nome: "Grátis SP", ufs: ["SP"] })], HOJE).precoCents, 2000);
ok("desconto 50% RJ", aplicarCampanhas(2000, RJ, 10000, [c({ nome: "RJ", ufs: ["RJ"], acao: "desconto_pct", valor: 50 })], HOJE).precoCents, 1000);
ok("desconto R$ 5", aplicarCampanhas(2000, RJ, 10000, [c({ ufs: ["RJ"], acao: "desconto_valor", valor: 500 })], HOJE).precoCents, 1500);
ok("desconto maior que o frete não fica negativo", aplicarCampanhas(300, RJ, 10000, [c({ ufs: ["RJ"], acao: "desconto_valor", valor: 500 })], HOJE).precoCents, 0);
ok("acréscimo 10%", aplicarCampanhas(2000, RJ, 10000, [c({ ufs: ["RJ"], acao: "acrescimo_pct", valor: 10 })], HOJE), { precoCents: 2200, campanha: null });
ok("acréscimo R$ 2,50", aplicarCampanhas(2000, RJ, 10000, [c({ ufs: ["RJ"], acao: "acrescimo_valor", valor: 250 })], HOJE).precoCents, 2250);
ok("acréscimos somam e vale o melhor desconto", aplicarCampanhas(2000, RJ, 10000, [
  c({ ufs: ["RJ"], acao: "acrescimo_valor", valor: 250 }),
  c({ ufs: ["RJ"], acao: "acrescimo_valor", valor: 250 }),
  c({ nome: "10%", ufs: ["RJ"], acao: "desconto_pct", valor: 10 }),
  c({ nome: "R$ 5", ufs: ["RJ"], acao: "desconto_valor", valor: 500 }),
], HOJE), { precoCents: 2000, campanha: "R$ 5" });
ok("compra mínima não atingida", aplicarCampanhas(2000, SP, 15000, [c({ ufs: ["SP"], minimoCents: 20000 })], HOJE).precoCents, 2000);
ok("compra mínima atingida", aplicarCampanhas(2000, SP, 20000, [c({ ufs: ["SP"], minimoCents: 20000 })], HOJE).precoCents, 0);
ok("desligada não vale", aplicarCampanhas(2000, SP, 10000, [c({ ufs: ["SP"], ativo: false })], HOJE).precoCents, 2000);
ok("fora do período não vale", aplicarCampanhas(2000, SP, 10000, [c({ ufs: ["SP"], inicio: "2027-05-01", fim: "2027-05-10" })], HOJE).precoCents, 2000);
ok("faixa de CEP", aplicarCampanhas(2000, "20500-000", 10000, [c({ tipo: "cep", cepInicio: "20000000", cepFim: "20999999" })], HOJE).precoCents, 0);

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
