import "server-only";

// Thin wrapper over the Resend REST API (no SDK — a plain fetch avoids the
// Node-version quirks other SDKs have here). Never throws to the caller:
// email must never break an order or a request. Returns whether it sent.

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /** Remetente diferente do padrão (ex.: contato@ para respostas da caixa). */
  from?: string;
  /** Cabeçalhos extras, como In-Reply-To, para a resposta entrar na conversa. */
  headers?: Record<string, string>;
  text?: string;
  /** Não registrar a falha em Erros do sistema (o próprio aviso de erro usa). */
  semRegistrarFalha?: boolean;
};

export type SendResult = { ok: true; id?: string } | { ok: false; reason: string };

// Versão que explica a falha. Telas de admin usam esta: "não foi possível
// enviar" não diz a quem está olhando se falta configurar a chave na Vercel,
// se o domínio não está verificado ou se o Resend recusou o destinatário.
// Fluxos voltados ao cliente continuam usando sendEmail(), que só devolve
// true/false e nunca vaza detalhe de infraestrutura.
export async function sendEmailDetailed(args: SendArgs): Promise<SendResult> {
  const r = await enviarResend(args);
  // E-mail que não saiu (confirmação de pedido, recuperação de senha, aviso
  // aos sócios) vai para Erros do sistema como "alto". O aviso de erro em si
  // não registra a própria falha, para não virar um laço.
  if (!r.ok && !args.semRegistrarFalha) {
    void import("./erros")
      .then(({ registrarErro }) =>
        registrarErro({
          origem: "servidor",
          tipo: "email",
          area: "email",
          gravidade: "alta",
          caminho: `e-mail: ${args.subject.slice(0, 120)}`,
          mensagem: `E-mail não enviado: ${r.reason}`,
          detalhe: `Para: ${[args.to].flat().join(", ")}`,
        }),
      )
      .catch(() => {});
  }
  return r;
}

async function enviarResend({
  to,
  subject,
  html,
  replyTo,
  from: fromArg,
  headers,
  text,
}: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = fromArg ?? process.env.EMAIL_FROM ?? "ALBIZIA <onboarding@resend.dev>";

  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email:", subject);
    return {
      ok: false,
      reason:
        "O envio de e-mail não está configurado: falta a variável RESEND_API_KEY no ambiente da Vercel.",
    };
  }

  if (from.includes("onboarding@resend.dev")) {
    console.warn("EMAIL_FROM not set — using Resend's test sender");
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers ? { headers } : {}),
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, corpo);

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          reason: `O Resend recusou o envio (${res.status}). Confira se a RESEND_API_KEY da Vercel é válida e se o remetente ${from} usa um domínio verificado.`,
        };
      }
      if (res.status === 429) {
        return { ok: false, reason: "O Resend está limitando o envio agora. Tente em instantes." };
      }
      return { ok: false, reason: `O Resend respondeu com erro ${res.status}.` };
    }

    const corpoOk = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: corpoOk.id };
  } catch (err) {
    console.error("Resend request error", err);
    return { ok: false, reason: "Não foi possível falar com o Resend." };
  }
}

export async function sendEmail(args: SendArgs): Promise<boolean> {
  return (await sendEmailDetailed(args)).ok;
}

const BRAND = "#121212";
const MUTED = "#55534e";
const FAINT = "#9a948a";
const PAGE = "#ece6da";
const LINE = "#eee9e0";
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br";

// A CTA button, e.g. `${emailButton("Ver coleção", `${SITE}/produtos`)}`.
// Bulletproof-ish (padded anchor) so it renders across mail clients.
export function emailButton(label: string, url: string): string {
  return `<div style="text-align:center;margin:34px 0 6px;">
    <a href="${url}" style="display:inline-block;background:${BRAND};color:#f2ede5;text-decoration:none;padding:16px 44px;font-family:${FONTE};font-size:12px;letter-spacing:2.5px;text-transform:uppercase;">${label}</a>
  </div>`;
}

// As imagens da marca sempre vêm do domínio de produção: um e-mail aberto no
// celular de alguém não alcança localhost nem uma prévia da Vercel.
const MARCA = "https://www.usealbizia.com.br/logo";

// A fonte do site. Apple Mail e iPhone carregam a Montserrat; Gmail e Outlook
// não aceitam fonte de fora e caem na Arial, que é a mais próxima disponível.
const FONTE = "Montserrat,Arial,Helvetica,sans-serif";

// Modelo de todos os e-mails da ALBIZIA, de pedido a acesso ao painel.
//
// O nome ALBIZIA é um desenho próprio, não uma fonte: por isso vai como
// IMAGEM (o arquivo oficial do site), junto com o símbolo da árvore. Se o
// programa de e-mail bloquear imagens (o Outlook bloqueia até a pessoa
// liberar), aparece o texto alternativo ALBIZIA espaçado no lugar, sem
// quebrar o layout. Estilos só inline: a maioria dos programas ignora <style>.
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet"></head>
  <body style="margin:0;background:${PAGE};font-family:${FONTE};color:${BRAND};">
    <div style="max-width:600px;margin:0 auto;padding:28px 14px;font-family:${FONTE};">
      <div style="background:${BRAND};padding:38px 24px 34px;text-align:center;">
        <a href="${SITE}" style="text-decoration:none;color:#f4efe6;">
          <img src="${MARCA}/symbol-white.png" width="46" height="47" alt="" style="display:block;margin:0 auto 18px;border:0;outline:none;width:46px;height:47px;">
          <img src="${MARCA}/wordmark-white.png" width="168" height="20" alt="ALBIZIA" style="display:block;margin:0 auto;border:0;outline:none;width:168px;height:20px;color:#f4efe6;font-family:${FONTE};font-size:20px;letter-spacing:9px;">
        </a>
      </div>
      <div style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:44px 40px;">
        <h1 style="margin:0 0 22px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:${FAINT};font-weight:700;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:26px 12px 8px;text-align:center;">
        <p style="margin:0 0 14px;">
          <a href="${SITE}/produtos" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Loja</a>
          <span style="color:#c9c1b2;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <a href="${SITE}/acompanhar" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Acompanhar pedido</a>
          <span style="color:#c9c1b2;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <a href="https://instagram.com/albizia" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Instagram</a>
        </p>
        <img src="${MARCA}/symbol-black.png" width="22" height="23" alt="" style="display:block;margin:22px auto 0;border:0;width:22px;height:23px;opacity:0.55;">
        <p style="margin:14px 0 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${FAINT};">Silence becomes style.</p>
        <p style="margin:6px 0 0;font-size:11px;color:${FAINT};">© ${new Date().getFullYear()} · usealbizia.com.br</p>
      </div>
    </div>
  </body></html>`;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Trata texto digitado por cliente antes de entrar no HTML de um e-mail.
 *
 * Nome, endereço, telefone e cupom vêm do formulário do checkout. Sem isto,
 * alguém podia fazer um pedido com um "nome" que é código HTML e colocar um
 * link falso dentro do e-mail de alerta que chega aos sócios, com a cara de
 * um e-mail legítimo da loja.
 */
export function esc(texto: string | number | null | undefined): string {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
