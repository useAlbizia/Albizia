/**
 * Testa a lista de domínios permitidos do link de recuperação de senha.
 *
 * Isto é fronteira de segurança: se um host de terceiro passar, o e-mail de
 * recuperação sai com link para o site do atacante e o token vaza quando a
 * vítima clica ("password reset poisoning").
 *
 * Rodar: npx tsx scripts/test-site-url.ts
 */
import Module from "node:module";

// `server-only` explode fora do Next. Neutralizado antes de qualquer import
// do módulo testado, por isso o import dele é dinâmico lá embaixo.
const load = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: unknown })._load = function (this: unknown, req: unknown, ...rest: unknown[]) {
  if (req === "server-only") return {};
  return load.call(this, req, ...rest);
};

let falhas = 0;

async function main() {
  const { hostPermitido } = await import("../src/lib/site-url");

  const ok = (host: string, esperado: boolean) => {
    const passou = hostPermitido(host) === esperado;
    if (!passou) falhas++;
    console.log(`${passou ? "  ok  " : "FALHOU"}  ${(esperado ? "aceita" : "REJEITA").padEnd(7)} ${host || "(vazio)"}`);
  };

  console.log("\nDeve ACEITAR (domínios nossos):");
  ok("usealbizia.com.br", true);
  ok("www.usealbizia.com.br", true);
  ok("usealbizia.com.br:443", true);
  ok("USEALBIZIA.COM.BR", true);
  ok("albizia-git-main.vercel.app", true);
  ok("localhost:3000", true);
  ok("127.0.0.1:3000", true);

  console.log("\nDeve REJEITAR (tentativas de sequestro do link):");
  // O clássico: sufixo que parece nosso mas termina em outro domínio.
  ok("usealbizia.com.br.evil.com", false);
  // Prefixo colado, sem o ponto separador.
  ok("evil-usealbizia.com.br", false);
  ok("naousealbizia.com.br", false);
  // Domínio totalmente alheio.
  ok("attacker.com", false);
  ok("localhost.evil.com", false);
  ok("vercel.app.evil.com", false);
  ok("", false);

  console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main();
