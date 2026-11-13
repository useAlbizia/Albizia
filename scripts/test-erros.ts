// Classificação dos erros (src/lib/erros-regras.ts).
// Rodar: npx tsx scripts/test-erros.ts
import { areaDoCaminho, chaveDoErro, gravidadeDe, intervaloAvisoMin } from "../src/lib/erros-regras";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = JSON.stringify(real) === JSON.stringify(esperado);
  if (!passou) falhas++;
  console.log(`  ${passou ? "ok  " : "FALHOU"}  ${nome}${passou ? "" : ` (veio ${JSON.stringify(real)})`}`);
}
const g = (origem: string, tipo: string, caminho: string) => gravidadeDe({ origem, tipo, area: areaDoCaminho(caminho) });

console.log("Áreas:");
ok("checkout é compra", areaDoCaminho("POST /checkout"), "compra");
ok("webhook do MP é pagamento", areaDoCaminho("POST /api/mercadopago/webhook"), "pagamento");
ok("login do painel é cadastro", areaDoCaminho("POST /admin/login"), "cadastro");
ok("pedido no painel é frete", areaDoCaminho("/admin/pedidos/abc"), "frete");
ok("fechamento é painel", areaDoCaminho("/admin/fechamento"), "painel");
ok("produto é loja", areaDoCaminho("/produto/camiseta"), "loja");

console.log("Gravidade:");
ok("erro de servidor no checkout: crítico", g("servidor", "acao", "POST /checkout"), "critica");
ok("erro no pagamento: crítico", g("servidor", "rota", "POST /api/mercadopago/process-payment"), "critica");
ok("banco fora na loja: crítico", g("servidor", "banco", "/produto/x"), "critica");
ok("banco fora no painel: médio", g("servidor", "banco", "/admin/fechamento"), "media");
ok("página da loja quebrou: alto", g("servidor", "tela", "/produtos"), "alta");
ok("etiqueta falhou: alto", g("servidor", "acao", "POST /admin/pedidos/1"), "alta");
ok("segurança: alto", g("servidor", "seguranca", "POST /api/mercadopago/webhook"), "alta");
ok("erro no aparelho do cliente no checkout: baixo (não é do site)", g("aparelho", "navegador", "/checkout"), "baixa");
ok("erro no aparelho do cliente na loja: baixo", g("aparelho", "navegador", "/produtos"), "baixa");
ok("erro no aparelho no painel: baixo", g("aparelho", "navegador", "/admin/socios"), "baixa");
ok("lentidão no painel: baixo", g("aparelho", "lentidao", "/admin/socios"), "baixa");

console.log("Agrupamento e aviso:");
ok("mesmo erro com números diferentes tem a mesma chave",
  chaveDoErro("compra", "POST /checkout?x=1", "pedido 123 falhou") === chaveDoErro("compra", "POST /checkout?x=2", "pedido 456 falhou"), true);
ok("crítico avisa a cada 15 min", intervaloAvisoMin("critica"), 15);
ok("alto avisa a cada 60 min", intervaloAvisoMin("alta"), 60);
ok("médio não manda e-mail na hora", intervaloAvisoMin("media"), null);

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
