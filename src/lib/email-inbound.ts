// E-mails recebidos em contato@usealbizia.com.br, pelo Resend.
//
// Mesmo desenho já usado no projeto da Barbearia Leste: o aviso do Resend
// (webhook) traz só o ID, e o conteúdo é buscado no próprio Resend com a
// nossa chave. Assim, mesmo um aviso forjado não consegue colocar na caixa um
// e-mail que não chegou de verdade.
//
// Sem "server-only" de propósito: as funções puras (endereço, spam,
// assinatura) são testadas por scripts/test-email-inbound.ts.

export type EmailRecebido = {
  id: string;
  deEmail: string;
  deNome: string | null;
  paraEmail: string;
  assunto: string;
  texto: string | null;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  anexos: { id: string; nome: string; tipo: string | null; tamanho: number | null }[];
  criadoEm: string | null;
  /** O filtro do servidor de recebimento marcou como spam ou vírus. */
  spam: boolean;
};

/** "Fulano <fulano@x.com>" → { nome, email } */
export function lerEndereco(bruto: unknown): { nome: string | null; email: string } {
  const s = Array.isArray(bruto) ? String(bruto[0] ?? "") : String(bruto ?? "");
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { nome: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { nome: null, email: s.trim().toLowerCase() };
}

function cabecalho(headers: unknown, nome: string): string | null {
  if (!headers || typeof headers !== "object") return null;
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (k.toLowerCase() === nome) return Array.isArray(v) ? String(v[0]) : String(v);
  }
  return null;
}

/** Veredito do filtro do Resend (Amazon SES): FAIL em spam ou vírus = spam. */
export function ehSpam(headers: unknown): boolean {
  const spam = (cabecalho(headers, "x-ses-spam-verdict") ?? "").toUpperCase();
  const virus = (cabecalho(headers, "x-ses-virus-verdict") ?? "").toUpperCase();
  return spam === "FAIL" || virus === "FAIL";
}

/** Busca o e-mail completo no Resend. null = não existe lá (ou falhou). */
export async function buscarEmailRecebido(emailId: string): Promise<EmailRecebido | null> {
  const key = process.env.RESEND_API_KEY;
  // O ID vai na URL: só caracteres de ID, nada que mude o caminho.
  if (!key || !/^[\w-]{6,80}$/.test(emailId)) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn("[email recebido] Resend respondeu", res.status);
    return null;
  }
  const d = (await res.json()) as Record<string, unknown>;
  const de = lerEndereco(d.from);
  const para = lerEndereco(Array.isArray(d.received_for) && d.received_for.length ? d.received_for : d.to);
  const anexos = Array.isArray(d.attachments) ? (d.attachments as Record<string, unknown>[]) : [];
  return {
    id: String(d.id ?? emailId),
    deEmail: de.email,
    deNome: de.nome,
    paraEmail: para.email,
    assunto: String(d.subject ?? ""),
    texto: typeof d.text === "string" ? d.text : null,
    html: typeof d.html === "string" ? d.html : null,
    messageId: typeof d.message_id === "string" ? d.message_id : cabecalho(d.headers, "message-id"),
    inReplyTo: cabecalho(d.headers, "in-reply-to"),
    anexos: anexos.map((a) => ({
      id: String(a.id ?? ""),
      nome: String(a.filename ?? "anexo"),
      tipo: typeof a.content_type === "string" ? a.content_type : null,
      tamanho: typeof a.size === "number" ? a.size : null,
    })),
    criadoEm: typeof d.created_at === "string" ? d.created_at : null,
    spam: ehSpam(d.headers),
  };
}

/** Link temporário do Resend para baixar um anexo recebido. */
export async function linkDoAnexo(emailId: string, anexoId: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !/^[\w-]{6,80}$/.test(emailId) || !/^[\w-]{1,80}$/.test(anexoId)) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${anexoId}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { download_url?: string };
  return d.download_url ?? null;
}

/**
 * Confere a assinatura do aviso do Resend (padrão Svix): HMAC-SHA256 de
 * "id.timestamp.corpo", em base64, com o segredo "whsec_..." decodificado.
 * Aviso com mais de 5 minutos é recusado, para um aviso antigo capturado não
 * poder ser reenviado depois.
 */
export async function assinaturaValida(
  corpo: string,
  h: { id: string | null; timestamp: string | null; signature: string | null },
  segredo: string,
  agora = Date.now(),
): Promise<boolean> {
  if (!h.id || !h.timestamp || !h.signature || !segredo) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(agora / 1000 - ts) > 5 * 60) return false;
  let chave: Uint8Array<ArrayBuffer>;
  try {
    chave = Uint8Array.from(atob(segredo.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${h.id}.${h.timestamp}.${corpo}`));
  const esperado = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return h.signature.split(" ").some((p) => p.split(",")[1] === esperado);
}
