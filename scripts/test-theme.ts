/**
 * Testa a resolução de tema.
 *
 * O risco real aqui é a preferência manual vazar para a loja (quebrando a
 * identidade da marca, que segue o relógio) ou o relógio desfazer a escolha
 * manual dentro do painel.
 *
 * Rodar: npx tsx scripts/test-theme.ts
 */
import { computeTheme, resolveTheme } from "../src/lib/theme";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = real === esperado;
  if (!passou) falhas++;
  console.log(`${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `  (esperava ${esperado}, veio ${real})`}`);
}

const meioDia = new Date(2026, 8, 26, 12, 0);
const noite = new Date(2026, 8, 26, 20, 0);
const madrugada = new Date(2026, 8, 26, 3, 0);

console.log("\nRelógio da marca (sem preferência):");
ok("meio-dia é claro", computeTheme(meioDia), "light");
ok("20h é escuro", computeTheme(noite), "dark");
ok("3h da manhã é escuro", computeTheme(madrugada), "dark");
ok("18h em ponto já é escuro", computeTheme(new Date(2026, 8, 26, 18, 0)), "dark");
ok("6h em ponto já é claro", computeTheme(new Date(2026, 8, 26, 6, 0)), "light");

console.log("\nLoja: a preferência do painel NÃO pode vazar para cá:");
ok("home com pref escuro segue o relógio", resolveTheme("/", "dark", meioDia), "light");
ok("produto com pref claro segue o relógio", resolveTheme("/produto/x", "light", noite), "dark");
ok("checkout com pref escuro segue o relógio", resolveTheme("/checkout", "dark", meioDia), "light");

console.log("\nPainel: a escolha manual vence o relógio:");
ok("/admin escuro ao meio-dia", resolveTheme("/admin", "dark", meioDia), "dark");
ok("/admin claro às 20h", resolveTheme("/admin", "light", noite), "light");
ok("subrota também", resolveTheme("/admin/pedidos", "dark", meioDia), "dark");
ok("/admin em auto segue o relógio", resolveTheme("/admin", "auto", meioDia), "light");
ok("/admin em auto às 20h", resolveTheme("/admin", "auto", noite), "dark");

console.log("\nBorda: rota que só começa com 'admin' sem barra é da loja:");
ok("/administrativo é loja, segue o relógio", resolveTheme("/administrativo", "dark", meioDia), "light");
ok("/admin exato é painel", resolveTheme("/admin", "dark", meioDia), "dark");
ok("/adminx é loja", resolveTheme("/adminx", "dark", meioDia), "light");

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
