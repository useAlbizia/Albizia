/**
 * Testa quem entra no painel.
 *
 * É a porta do painel inteiro (pedidos, dinheiro dos sócios, clientes), então
 * o caso que mais importa é o de quem tenta se promover sozinho: o Supabase
 * deixa o próprio usuário editar `user_metadata`, e por isso a decisão nunca
 * pode olhar ali. Só `app_metadata`, que só o servidor escreve, conta.
 *
 * Rodar: npx tsx scripts/test-admin.ts
 */
import { isAdminUser } from "../src/lib/auth/admins";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = real === esperado;
  if (!passou) falhas++;
  console.log(`${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `  (esperava ${esperado}, veio ${real})`}`);
}

console.log("\nQuem entra no painel:");
ok("fundador pela lista de e-mails", isAdminUser({ email: "nilson.brites@gmail.com" }), true);
ok("lista ignora maiúsculas", isAdminUser({ email: "Jairrodrigues04@Gmail.com" }), true);
ok("conta criada pelo painel (marca de admin)", isAdminUser({ email: "socio@exemplo.com", app_metadata: { role: "admin", provider: "email" } }), true);

console.log("\nQuem NÃO entra:");
ok("cliente comum", isAdminUser({ email: "cliente@exemplo.com", app_metadata: { provider: "email" } }), false);
ok("cliente que entrou com Google", isAdminUser({ email: "cliente@gmail.com", app_metadata: { provider: "google" } }), false);
// O ataque: o cliente grava role=admin no user_metadata dele, que ele mesmo
// consegue editar pelo próprio login. Não pode funcionar.
const tentativa = { email: "intruso@exemplo.com", app_metadata: { provider: "email" }, user_metadata: { role: "admin" } };
ok("cliente que se promove pelo user_metadata", isAdminUser(tentativa), false);
ok("marca com outro valor", isAdminUser({ email: "x@exemplo.com", app_metadata: { role: "Admin " } }), false);
ok("sem login", isAdminUser(null), false);
ok("sem e-mail e sem marca", isAdminUser({ email: null, app_metadata: null }), false);

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
