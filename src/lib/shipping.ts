import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";
import { computeShipping, type ShippingConfig, type ShippingOption } from "./shipping-calc";
import {
  meBaseUrl,
  normalizeEnvironment,
  type MeEnvironment,
  type MeParty,
  type MeVolume,
} from "./melhor-envio";

// ── Swappable shipping strategy ──────────────────────────────────────────
// Two methods, chosen in Admin → Frete:
//  - "flat": an admin-set national rate + free-above threshold (computeShipping).
//  - "melhor_envio": live carrier rates by CEP via the Melhor Envio API.
// The checkout and order flow call quoteShipping()/getShippingConfig() only —
// swapping carriers later means changing this file, nothing else.

export { computeShipping };
export type { ShippingConfig };

export type ShippingSettings = {
  method: "flat" | "melhor_envio";
  flatCents: number;
  freeThresholdCents: number;
  meToken: string; // SECRET — never send to the client
  meTokenSandbox: string; // SECRET
  /** Ids dos serviços oferecidos no checkout, ex.: "1,2,17". */
  meServices: string;
  meEnvironment: MeEnvironment;
  meFromCep: string;
  meWeightGrams: number;
  meLengthCm: number;
  meWidthCm: number;
  meHeightCm: number;
  // Remetente completo. A cotação só precisa do CEP; a COMPRA da etiqueta
  // exige o resto, e sem ele o botão de gerar etiqueta não tem o que mandar.
  meFrom: MeParty;
};

// Full shipping settings, INCLUDING the Melhor Envio token. Server-only — never
// expose the return value (or meToken) to the client.
export async function getShippingSettings(): Promise<ShippingSettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  return {
    method: (row?.shippingMethod as "flat" | "melhor_envio") ?? "flat",
    flatCents: row?.shippingFlatCents ?? 0,
    freeThresholdCents: row?.freeShippingThresholdCents ?? 0,
    meToken: row?.meToken ?? "",
    meTokenSandbox: row?.meTokenSandbox ?? "",
    meEnvironment: normalizeEnvironment(row?.meEnvironment),
    meServices: row?.meServices ?? "1,2,17",
    meFromCep: row?.meFromCep ?? "",
    meWeightGrams: row?.meWeightGrams ?? 300,
    meLengthCm: row?.meLengthCm ?? 20,
    meWidthCm: row?.meWidthCm ?? 20,
    meHeightCm: row?.meHeightCm ?? 4,
    meFrom: {
      name: row?.meFromName ?? "",
      document: "",
      companyDocument: row?.meFromDocument ?? "",
      phone: row?.meFromPhone ?? "",
      email: row?.meFromEmail ?? "",
      address: row?.meFromAddress ?? "",
      number: row?.meFromNumber ?? "",
      complement: row?.meFromComplement ?? "",
      district: row?.meFromDistrict ?? "",
      city: row?.meFromCity ?? "",
      stateAbbr: row?.meFromState ?? "",
      postalCode: row?.meFromCep ?? "",
    },
  };
}

/**
 * O token do ambiente ativo.
 *
 * VARIÁVEL DE AMBIENTE PRIMEIRO, banco como reserva, igual às credenciais do
 * Mercado Pago (ver `appCredentials` em lib/mercadopago-oauth.ts). O token do
 * Melhor Envio é credencial de integração, não configuração de loja: o lugar
 * dele é o .env.local em desenvolvimento e a Vercel em produção, não uma
 * coluna de banco que aparece em backup e no painel do Supabase.
 *
 * O campo no banco continua existindo para quem preferir colar pelo painel,
 * mas quem está na Vercel ganha.
 *
 * Produção e sandbox são CONTAS diferentes no Melhor Envio, com tokens
 * diferentes, por isso dois nomes de variável. Todo lugar que fala com eles
 * passa por aqui, para ninguém mandar token de um ambiente no host do outro,
 * que vira um 401 difícil de diagnosticar.
 */
export function activeMeToken(s: ShippingSettings): string {
  // trim() porque colar o token no painel da Vercel deixa um espaço ou uma
  // quebra de linha sobrando com facilidade, e "Bearer  eyJ..." com espaço a
  // mais vira 401 sem nenhuma pista do motivo.
  if (s.meEnvironment === "sandbox") {
    return (process.env.TOKEN_MELHOR_ENVIOS_SANDBOX || s.meTokenSandbox || "").trim();
  }
  return (process.env.TOKEN_MELHOR_ENVIOS || s.meToken || "").trim();
}

/** Se o token ativo vem da Vercel, o painel não deve fingir que é dele. */
export function tokenVemDoAmbiente(env: MeEnvironment): boolean {
  return env === "sandbox"
    ? !!process.env.TOKEN_MELHOR_ENVIOS_SANDBOX
    : !!process.env.TOKEN_MELHOR_ENVIOS;
}

/** O que falta para conseguir COMPRAR etiqueta. Vazio = está pronto. */
export function faltaParaEtiqueta(s: ShippingSettings): string[] {
  const falta: string[] = [];
  if (!activeMeToken(s)) falta.push("token do Melhor Envio");
  const f = s.meFrom;
  if (!f.name) falta.push("nome do remetente");
  if (!onlyDigits(f.companyDocument ?? "")) falta.push("CNPJ do remetente");
  if (!f.phone) falta.push("telefone do remetente");
  if (!f.address) falta.push("rua do remetente");
  if (!f.number) falta.push("número do remetente");
  if (!f.district) falta.push("bairro do remetente");
  if (!f.city) falta.push("cidade do remetente");
  if (!f.stateAbbr) falta.push("UF do remetente");
  if (onlyDigits(f.postalCode).length !== 8) falta.push("CEP de origem");
  return falta;
}

// The flat config used by the cart/checkout preview (no CEP needed). For
// Melhor Envio the real price only exists once a CEP is entered.
export async function getShippingConfig(): Promise<ShippingConfig> {
  const s = await getShippingSettings();
  return { flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents };
}

export type MeCredentialCheck =
  | { ok: true; name: string; email: string; firstName: string }
  | { ok: false; message: string };

// Valida o token do Melhor Envio contra a API e diz de qual conta ele é, para
// o fundador confirmar a conexão no admin em vez de descobrir que está errado
// na primeira cotação de um cliente real.
export async function testMelhorEnvioToken(
  token: string,
  env: MeEnvironment = "production",
): Promise<MeCredentialCheck> {
  const t = token.trim();
  if (!t) return { ok: false, message: "Nenhum token salvo ainda." };

  try {
    const res = await fetch(`${meBaseUrl(env)}/api/v2/me`, {
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: "application/json",
        "User-Agent": "ALBIZIA (contato@usealbizia.com.br)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        message:
          res.status === 401
            ? "Token inválido ou expirado. Gere um novo em Melhor Envio, Integrações, Tokens."
            : `O Melhor Envio respondeu com erro ${res.status}.`,
      };
    }

    const data = (await res.json()) as {
      firstname?: string;
      lastname?: string;
      email?: string;
    };
    const firstName = data.firstname ?? "";
    return {
      ok: true,
      firstName,
      name: [data.firstname, data.lastname].filter(Boolean).join(" "),
      email: data.email ?? "",
    };
  } catch {
    return { ok: false, message: "Não foi possível falar com o Melhor Envio. Tente de novo." };
  }
}

// Definido em shipping-calc.ts (client-safe) e reexportado aqui para quem já
// importava daqui não precisar mudar.
export type { ShippingOption };

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// ── O pacote ─────────────────────────────────────────────────────────────
//
// UMA função só calcula o pacote, e ela serve tanto a cotação quanto a compra
// da etiqueta. Se as duas contas divergirem, o cliente paga um frete e a
// etiqueta custa outro, e a diferença sai do bolso de quem vende em TODA
// venda. É o tipo de erro que só aparece no fim do mês.

/** Uma linha do carrinho, com as medidas da peça já embalada. */
export type CartLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  // Zero em qualquer um significa "usa o pacote padrão do admin", para o
  // fundador poder abrir a loja antes de medir peça por peça.
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

/**
 * As peças empilhadas num pacote só.
 *
 * Altura soma (as peças vão uma sobre a outra), comprimento e largura pegam a
 * maior (o pacote é do tamanho da maior peça), peso soma. Não é perfeito para
 * carrinho grande, mas erra para mais, e errar para mais é o cliente pagar
 * alguns centavos a mais em vez de a loja pagar a diferença.
 */
export function packageFor(lines: CartLine[], s: ShippingSettings): MeVolume {
  let weightGrams = 0;
  let heightCm = 0;
  let lengthCm = 0;
  let widthCm = 0;

  for (const l of lines) {
    const q = Math.max(1, l.quantity);
    weightGrams += (l.weightGrams || s.meWeightGrams) * q;
    heightCm += (l.heightCm || s.meHeightCm) * q;
    lengthCm = Math.max(lengthCm, l.lengthCm || s.meLengthCm);
    widthCm = Math.max(widthCm, l.widthCm || s.meWidthCm);
  }

  // Carrinho vazio não existe, mas um pacote de zero também não.
  return {
    weightGrams: Math.max(50, weightGrams),
    lengthCm: Math.max(1, lengthCm || s.meLengthCm),
    widthCm: Math.max(1, widthCm || s.meWidthCm),
    heightCm: Math.max(1, heightCm || s.meHeightCm),
  };
}

// Live quote from Melhor Envio for one destination CEP. Returns [] on any
// failure so the checkout can fall back gracefully — quoting must never break
// a sale.
export async function quoteMelhorEnvio(
  toCep: string,
  lines: CartLine[],
  settings?: ShippingSettings
): Promise<ShippingOption[]> {
  const s = settings ?? (await getShippingSettings());
  const token = activeMeToken(s);
  const from = onlyDigits(s.meFromCep);
  const to = onlyDigits(toCep);
  if (!token || from.length !== 8 || to.length !== 8) return [];

  const vol = packageFor(lines, s);
  const segurado = lines.reduce((n, l) => n + l.unitPriceCents * Math.max(1, l.quantity), 0);

  try {
    const res = await fetch(
      `${meBaseUrl(s.meEnvironment)}/api/v2/me/shipment/calculate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "ALBIZIA (contato@usealbizia.com.br)",
        },
        body: JSON.stringify({
          from: { postal_code: from },
          to: { postal_code: to },
          package: {
            weight: Math.max(0.05, vol.weightGrams / 1000),
            width: vol.widthCm,
            height: vol.heightCm,
            length: vol.lengthCm,
          },
          // Valor segurado: o que a transportadora paga se extraviar. Sem
          // isso um pacote perdido é prejuízo integral da loja.
          options: { receipt: false, own_hand: false, insurance_value: segurado / 100 },
          // Só os serviços escolhidos no painel. Vazio seria "todos", e isso
          // incluiria transportadoras que exigem nota fiscal.
          ...(servicosValidos(s.meServices) ? { services: servicosValidos(s.meServices) } : {}),
        }),
      }
    );
    if (!res.ok) {
      console.error("Melhor Envio quote failed", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      price: string;
      delivery_time?: number;
      company?: { name?: string };
      error?: string;
    }>;
    return data
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        id: o.id,
        name: o.name,
        company: o.company?.name ?? "",
        priceCents: Math.round(parseFloat(o.price) * 100),
        deliveryDays: o.delivery_time ?? null,
      }))
      .sort((a, b) => a.priceCents - b.priceCents);
  } catch (err) {
    console.error("Melhor Envio quote error", err);
    return [];
  }
}

/**
 * O frete que vale para o pedido, e QUAL serviço é.
 *
 * Devolver só o valor era o buraco que impedia emitir etiqueta: na hora de
 * comprar, o Melhor Envio pergunta se é PAC, SEDEX ou Jadlog, e a resposta
 * tinha sido jogada fora. Agora o pedido guarda a escolha.
 *
 * `chosenServiceId` é o que o cliente selecionou no checkout. Se ele não
 * escolheu (ou escolheu algo que sumiu da cotação), cai no mais barato, que é
 * o comportamento antigo e nunca deixa a venda travar.
 */
export type QuotedShipping = {
  cents: number;
  option: ShippingOption | null;
};

export async function quoteShipping(
  toCep: string,
  subtotalCents: number,
  lines: CartLine[],
  chosenServiceId?: number | null
): Promise<QuotedShipping> {
  const s = await getShippingSettings();

  if (s.freeThresholdCents > 0 && subtotalCents >= s.freeThresholdCents) {
    // Frete grátis é promoção da loja, não ausência de envio: ainda precisa
    // de um serviço para a etiqueta, e quem paga é a loja.
    if (s.method === "melhor_envio") {
      const options = await quoteMelhorEnvio(toCep, lines, s);
      const escolhido = options.find((o) => o.id === chosenServiceId) ?? options[0] ?? null;
      return { cents: 0, option: escolhido };
    }
    return { cents: 0, option: null };
  }

  if (s.method === "melhor_envio") {
    const options = await quoteMelhorEnvio(toCep, lines, s);
    const escolhido = options.find((o) => o.id === chosenServiceId) ?? options[0];
    if (escolhido) return { cents: escolhido.priceCents, option: escolhido };
    // Carrier unreachable → fall back to the flat rate so checkout still works.
  }
  return {
    cents: computeShipping(
      subtotalCents,
      { flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents },
      toCep
    ),
    option: null,
  };
}

// ── Serviços oferecidos ──────────────────────────────────────────────────

export type MeServiceInfo = {
  id: number;
  company: string;
  name: string;
  /** Por que a loja não consegue oferecer este serviço hoje. null = pode. */
  bloqueio: string | null;
};

/** "1, 2,x,17" vira "1,2,17". Lixo no campo não pode virar filtro inválido. */
export function servicosValidos(csv: string): string {
  return (csv ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /^\d+$/.test(p))
    .join(",");
}

function motivoBloqueio(requisitos: unknown): string | null {
  if (Array.isArray(requisitos)) {
    // "invoice" = exige chave de nota fiscal. A loja é MEI e despacha com
    // declaração de conteúdo, então o carrinho seria recusado na hora de
    // comprar a etiqueta, com o cliente já tendo pago.
    return requisitos.includes("invoice") ? "exige nota fiscal" : null;
  }
  // Regras em formato de objeto (Total Express) pedem agência de postagem e
  // outros campos que o fluxo de etiqueta ainda não manda.
  return requisitos ? "exige configuração de agência" : null;
}

// Retrato da lista do Melhor Envio em 2026-10-08, usado se a API não
// responder. Com a API no ar, a lista viva sempre ganha.
const CATALOGO_RESERVA: MeServiceInfo[] = [
  { id: 1, company: "Correios", name: "PAC", bloqueio: null },
  { id: 2, company: "Correios", name: "SEDEX", bloqueio: null },
  { id: 17, company: "Correios", name: "Mini Envios", bloqueio: null },
  { id: 31, company: "Loggi", name: "Express", bloqueio: null },
  { id: 32, company: "Loggi", name: "Coleta", bloqueio: null },
  { id: 34, company: "Loggi", name: "Loggi Ponto", bloqueio: null },
  { id: 33, company: "JeT", name: "Standard", bloqueio: null },
  { id: 3, company: "Jadlog", name: ".Package", bloqueio: "exige nota fiscal" },
  { id: 4, company: "Jadlog", name: ".Com", bloqueio: "exige nota fiscal" },
  { id: 27, company: "Jadlog", name: ".Package Centralizado", bloqueio: "exige nota fiscal" },
  { id: 12, company: "LATAM Cargo", name: "éFácil", bloqueio: "exige nota fiscal" },
  { id: 15, company: "Azul Cargo Express", name: "Expresso", bloqueio: "exige nota fiscal" },
  { id: 16, company: "Azul Cargo Express", name: "e-commerce", bloqueio: "exige nota fiscal" },
  { id: 22, company: "Buslog", name: "Rodoviário", bloqueio: "exige nota fiscal" },
  { id: 35, company: "Total Express", name: "Standard", bloqueio: "exige configuração de agência" },
];

/** Todos os serviços da conta, com o motivo de bloqueio quando houver. */
export async function listarServicosMe(s: ShippingSettings): Promise<MeServiceInfo[]> {
  const token = activeMeToken(s);
  if (!token) return CATALOGO_RESERVA;
  try {
    const res = await fetch(`${meBaseUrl(s.meEnvironment)}/api/v2/me/shipment/services`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "ALBIZIA (contato@usealbizia.com.br)",
      },
      // A lista de serviços muda raramente; um dia de cache poupa uma chamada
      // a cada abertura do painel.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return CATALOGO_RESERVA;
    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      company?: { name?: string };
      requirements?: unknown;
    }>;
    return data.map((x) => ({
      id: x.id,
      company: x.company?.name ?? "",
      name: x.name,
      bloqueio: motivoBloqueio(x.requirements),
    }));
  } catch {
    return CATALOGO_RESERVA;
  }
}
