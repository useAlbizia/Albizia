import "server-only";
import { adminGenerateRecoveryLink } from "./supabase/admin";
import { sendEmailDetailed, emailShell, emailButton } from "./email";
import { getSiteOrigin } from "./site-url";

// E-mail de recuperação de senha com a cara da ALBIZIA.
//
// O padrão do Supabase chega como "Supabase Auth
// <noreply@mail.app.supabase.io>", em inglês, com rodapé "powered by
// Supabase". Ninguém reconhece a loja nisso, e link de senha vindo de
// remetente estranho parece golpe, que é o oposto do que a gente precisa
// transmitir. Então geramos o link pela API admin (sem disparo do Supabase)
// e enviamos pelo mesmo Resend que já manda confirmação de pedido.

type Destino = "admin" | "cliente";

const TEXTOS: Record<Destino, { rota: string; assunto: string; titulo: string; intro: string }> = {
  admin: {
    rota: "/admin/redefinir",
    assunto: "Recuperação de acesso ao painel · ALBIZIA",
    titulo: "Recuperar acesso ao painel",
    intro:
      "Recebemos um pedido para redefinir a senha do seu acesso ao painel administrativo da ALBIZIA. Clique no botão abaixo para escolher uma nova senha.",
  },
  cliente: {
    rota: "/conta/redefinir",
    assunto: "Recuperação de senha · ALBIZIA",
    titulo: "Recuperar sua senha",
    intro:
      "Recebemos um pedido para redefinir a senha da sua conta na ALBIZIA. Clique no botão abaixo para escolher uma nova senha.",
  },
};

export async function sendBrandedRecoveryEmail(
  email: string,
  destino: Destino,
): Promise<{ ok: boolean; error?: string }> {
  const t = TEXTOS[destino];
  const origin = await getSiteOrigin();

  const { link, error } = await adminGenerateRecoveryLink({
    email,
    redirectTo: `${origin}${t.rota}`,
  });

  if (error || !link) {
    // Inclui o caso de e-mail inexistente. Quem chama decide o que mostrar;
    // no fluxo público a resposta é sempre a mesma, para não revelar quais
    // e-mails têm conta.
    return { ok: false, error: error ?? "Não foi possível gerar o link." };
  }

  const enviado = await sendEmailDetailed({
    to: email,
    subject: t.assunto,
    html: emailShell(
      t.titulo,
      `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 4px;">${t.intro}</p>
       ${emailButton("Criar nova senha", link)}
       <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:26px 0 0;">
         O link vale por uma hora e só pode ser usado uma vez.
       </p>
       <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:10px 0 0;">
         Se não foi você que pediu, ignore esta mensagem. Sua senha atual continua valendo e
         ninguém consegue trocá-la sem abrir este link.
       </p>`,
    ),
  });

  // O motivo real sobe para quem está no painel: sem isso, "não foi possível
  // enviar" não distingue chave ausente na Vercel de domínio não verificado.
  if (!enviado.ok) return { ok: false, error: enviado.reason };
  return { ok: true };
}

/**
 * E-mail de confirmação de cadastro com a cara da ALBIZIA.
 *
 * O link aponta para uma rota NOSSA (/auth/confirmar), que confere o código
 * no servidor e já deixa a pessoa logada. Não passa pelo endereço do
 * Supabase, então o cliente nunca vê "supabase.co" em lugar nenhum.
 */
export async function sendBrandedSignupEmail(
  email: string,
  nome: string,
  tokenHash: string,
  tipo: string,
): Promise<{ ok: boolean; error?: string }> {
  const origin = await getSiteOrigin();
  const p = new URLSearchParams({ token_hash: tokenHash, type: tipo, next: "/conta" });
  const link = `${origin}/auth/confirmar?${p.toString()}`;
  const primeiro = (nome || "").trim().split(/\s+/)[0] ?? "";

  const enviado = await sendEmailDetailed({
    to: email,
    subject: "Confirme seu cadastro · ALBIZIA",
    html: emailShell(
      "Confirme seu e-mail",
      `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 4px;">${primeiro ? `Olá, ${escaparHtml(primeiro)}. ` : ""}Falta só confirmar que este e-mail é seu para ativar sua conta na ALBIZIA.</p>
       ${emailButton("Confirmar meu e-mail", link)}
       <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:26px 0 0;">
         O link vale por um dia e só pode ser usado uma vez.
       </p>
       <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:10px 0 0;">
         Se não foi você que criou esta conta, ignore esta mensagem. Sem a confirmação, ela não é ativada.
       </p>`,
    ),
  });
  if (!enviado.ok) return { ok: false, error: enviado.reason };
  return { ok: true };
}

// O nome vem do formulário de cadastro: sem escapar, alguém poderia se
// cadastrar com um "nome" que é HTML e injetar conteúdo no e-mail.
function escaparHtml(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
