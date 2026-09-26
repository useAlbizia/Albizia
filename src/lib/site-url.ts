import "server-only";
import { headers } from "next/headers";

// De onde sai a URL usada em link de e-mail (recuperação de senha, etc).
//
// POR QUE NÃO SÓ A VARIÁVEL DE AMBIENTE: com
// `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, esquecer de
// configurar a variável em produção faz o e-mail de recuperação apontar para
// localhost. Aconteceu de verdade: um sócio ficou trancado fora do painel.
// O domínio real da requisição não tem como estar errado.
//
// POR QUE COM LISTA DE PERMISSÃO: confiar cegamente no cabeçalho Host abre
// "password reset poisoning". Um pedido forjado com Host de terceiro faria o
// e-mail sair com link para o domínio do atacante, e o token de recuperação
// vazaria no clique da vítima. Então o host só é aceito se for um domínio
// nosso; qualquer outro cai no domínio configurado.

const DOMINIOS_PERMITIDOS = [
  "usealbizia.com.br",
  "usealbizia.com",
  "vercel.app", // previews do projeto
  "localhost",
  "127.0.0.1",
];

const PADRAO = "https://usealbizia.com.br";

function hostPermitido(host: string): boolean {
  const semPorta = host.split(":")[0].toLowerCase();
  return DOMINIOS_PERMITIDOS.some((d) => semPorta === d || semPorta.endsWith(`.${d}`));
}

export async function getSiteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && hostPermitido(host)) {
      const proto =
        h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Fora de um contexto de requisição (cron, script): usa o configurado.
  }

  const configurado = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  // Uma variável apontando para localhost em produção é justamente o erro que
  // este arquivo existe para impedir, então ela é ignorada nesse caso.
  if (configurado && !/localhost|127\.0\.0\.1/.test(configurado)) return configurado;
  return PADRAO;
}
