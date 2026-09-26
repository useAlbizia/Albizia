import "server-only";

// ── Melhor Envio: do carrinho até a etiqueta na mão ──────────────────────
//
// A cotação vive em lib/shipping.ts porque o checkout precisa dela. Aqui fica
// o resto do caminho, que só o painel usa: inserir o envio, comprar, gerar a
// etiqueta, imprimir, emitir a declaração de conteúdo, rastrear e cancelar.
//
// DOIS AMBIENTES, DOIS TOKENS. O sandbox do Melhor Envio não é um "modo teste"
// da conta de produção: é outro cadastro, outro login, outro token, e nada
// atravessa de um lado para o outro. Por isso o token de cada ambiente tem seu
// próprio campo, e trocar de ambiente não apaga o token bom.

const HOSTS = {
  production: "https://www.melhorenvio.com.br",
  sandbox: "https://sandbox.melhorenvio.com.br",
} as const;

export type MeEnvironment = keyof typeof HOSTS;

export function normalizeEnvironment(v: string | null | undefined): MeEnvironment {
  return v === "sandbox" ? "sandbox" : "production";
}

export function meBaseUrl(env: string | null | undefined): string {
  return HOSTS[normalizeEnvironment(env)];
}

// O Melhor Envio pede identificação de quem está chamando, com e-mail de
// contato, e responde 403 para quem não manda.
const USER_AGENT = "ALBIZIA (contato@usealbizia.com.br)";

export type MeCall<T> = { ok: true; data: T } | { ok: false; message: string; status?: number };

type CallOptions = {
  token: string;
  env: string | null | undefined;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

/**
 * Uma chamada à API, com o erro já traduzido.
 *
 * Nunca lança: todo caminho de erro vira `{ ok: false, message }` em português,
 * porque cada uma dessas falhas vai parar na tela de alguém que está tentando
 * despachar um pedido e precisa saber o que fazer, não ler um stack trace.
 */
export async function meCall<T>({ token, env, path, method = "GET", body }: CallOptions): Promise<MeCall<T>> {
  const t = token.trim();
  if (!t) {
    return {
      ok: false,
      message:
        normalizeEnvironment(env) === "sandbox"
          ? "Nenhum token de sandbox salvo. Configure em Entrega e frete."
          : "Nenhum token do Melhor Envio salvo. Configure em Entrega e frete.",
    };
  }

  try {
    const res = await fetch(`${meBaseUrl(env)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    const texto = await res.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      // Resposta que não é JSON (HTML de erro, página de manutenção).
    }

    if (!res.ok) {
      return { ok: false, status: res.status, message: mensagemDeErro(res.status, json, env) };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "Não foi possível falar com o Melhor Envio. Tente de novo." };
  }
}

function mensagemDeErro(status: number, json: unknown, env: string | null | undefined): string {
  const corpo = json as { message?: string; error?: string; errors?: Record<string, string[]> } | null;

  // O 422 carrega o motivo real (campo faltando, CEP inválido, sem saldo).
  // Repassar o texto do Melhor Envio é mais útil que qualquer frase minha.
  if (corpo?.errors) {
    const primeiro = Object.values(corpo.errors).flat().filter(Boolean)[0];
    if (primeiro) return primeiro;
  }
  if (corpo?.message) return corpo.message;
  if (corpo?.error) return corpo.error;

  if (status === 401) {
    return normalizeEnvironment(env) === "sandbox"
      ? "Token de sandbox inválido ou expirado. Gere outro no sandbox.melhorenvio.com.br."
      : "Token inválido ou expirado. Gere um novo em Melhor Envio, Integrações, Tokens.";
  }
  if (status === 403) return "O token não tem permissão para esta ação. Confira os escopos ao gerar o token.";
  return `O Melhor Envio respondeu com erro ${status}.`;
}

// ── Saldo da carteira ────────────────────────────────────────────────────
// A compra da etiqueta debita da Melhor Carteira. Sem saldo o botão falha, e
// falhar na hora de despachar é o pior momento possível para descobrir isso.
// Por isso o painel mostra o saldo antes.

export type MeBalance = { balanceCents: number };

export async function meSaldo(token: string, env: string | null | undefined): Promise<MeCall<MeBalance>> {
  const r = await meCall<{ balance?: number | string }>({ token, env, path: "/api/v2/me/balance" });
  if (!r.ok) return r;
  const bruto = Number(r.data?.balance ?? 0);
  return { ok: true, data: { balanceCents: Math.round((Number.isFinite(bruto) ? bruto : 0) * 100) } };
}

// ── Quem envia e quem recebe ─────────────────────────────────────────────

export type MeParty = {
  name: string;
  phone: string;
  email: string;
  document: string; // CPF, só dígitos
  companyDocument?: string; // CNPJ, só dígitos
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
};

const digitos = (s: string) => (s ?? "").replace(/\D/g, "");

function corpoDaParte(p: MeParty): Record<string, unknown> {
  const cpf = digitos(p.document);
  const cnpj = digitos(p.companyDocument ?? "");
  return {
    name: p.name,
    phone: p.phone,
    email: p.email,
    // Pessoa física manda CPF, pessoa jurídica manda CNPJ. Mandar os dois
    // vazios é o que faz o Melhor Envio recusar o carrinho.
    ...(cnpj ? { company_document: cnpj } : {}),
    ...(cpf ? { document: cpf } : {}),
    address: p.address,
    complement: p.complement,
    number: p.number,
    district: p.district,
    city: p.city,
    state_abbr: p.stateAbbr,
    postal_code: digitos(p.postalCode),
    country_id: "BR",
  };
}

// ── Inserir o envio no carrinho ──────────────────────────────────────────

export type MeProduct = { name: string; quantity: number; unitaryValueCents: number };
export type MeVolume = { weightGrams: number; lengthCm: number; widthCm: number; heightCm: number };

export type MeCartInput = {
  serviceId: number;
  from: MeParty;
  to: MeParty;
  products: MeProduct[];
  volume: MeVolume;
  insuranceValueCents: number;
  /**
   * Sem nota fiscal o envio vai como não comercial e o Melhor Envio emite a
   * declaração de conteúdo (DACE). Com nota, manda-se a chave de acesso e vai
   * a nota. Hoje a loja é MEI e vende para pessoa física, então o caminho
   * normal é a declaração. Ver lib/fiscal.ts.
   */
  invoiceKey?: string;
};

export type MeCartResult = { id: string; protocol?: string; price?: string };

export async function meInserirNoCarrinho(
  token: string,
  env: string | null | undefined,
  input: MeCartInput,
): Promise<MeCall<MeCartResult>> {
  const semNota = !input.invoiceKey;

  return meCall<MeCartResult>({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/cart",
    body: {
      service: input.serviceId,
      from: corpoDaParte(input.from),
      to: corpoDaParte(input.to),
      products: input.products.map((p) => ({
        name: p.name,
        quantity: String(p.quantity),
        unitary_value: (p.unitaryValueCents / 100).toFixed(2),
      })),
      volumes: [
        {
          // O Melhor Envio quer quilos e centímetros.
          weight: Math.max(0.05, input.volume.weightGrams / 1000),
          length: Math.max(1, input.volume.lengthCm),
          width: Math.max(1, input.volume.widthCm),
          height: Math.max(1, input.volume.heightCm),
        },
      ],
      options: {
        insurance_value: input.insuranceValueCents / 100,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: semNota,
        platform: "ALBIZIA",
        ...(input.invoiceKey ? { invoice: { key: input.invoiceKey } } : {}),
      },
    },
  });
}

// ── Comprar, gerar, imprimir ─────────────────────────────────────────────

export type MeCompra = {
  purchaseCents: number;
  status: string;
};

/** Paga o envio com o saldo da Melhor Carteira. É aqui que sai dinheiro. */
export async function meComprar(
  token: string,
  env: string | null | undefined,
  meOrderIds: string[],
): Promise<MeCall<MeCompra>> {
  const r = await meCall<{ purchase?: { total?: number | string; status?: string } }>({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/shipment/checkout",
    body: { orders: meOrderIds },
  });
  if (!r.ok) return r;
  const total = Number(r.data?.purchase?.total ?? 0);
  return {
    ok: true,
    data: {
      purchaseCents: Math.round((Number.isFinite(total) ? total : 0) * 100),
      status: r.data?.purchase?.status ?? "",
    },
  };
}

/** Gera a etiqueta de um envio já pago. */
export async function meGerar(
  token: string,
  env: string | null | undefined,
  meOrderIds: string[],
): Promise<MeCall<Record<string, { status?: boolean; message?: string }>>> {
  return meCall({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/shipment/generate",
    body: { orders: meOrderIds },
  });
}

/** Link público do PDF da etiqueta, para imprimir e colar no pacote. */
export async function meImprimir(
  token: string,
  env: string | null | undefined,
  meOrderIds: string[],
): Promise<MeCall<string>> {
  const r = await meCall<{ url?: string }>({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/shipment/print",
    body: { mode: "public", orders: meOrderIds },
  });
  if (!r.ok) return r;
  if (!r.data?.url) return { ok: false, message: "O Melhor Envio não devolveu o link da etiqueta." };
  return { ok: true, data: r.data.url };
}

/**
 * Declaração de conteúdo (DACE), o papel que vai junto quando não há nota.
 *
 * No sandbox a impressão da DACE só existe para serviços da Jadlog, então um
 * teste com Correios volta erro aqui e isso não é bug nosso.
 */
export async function meDeclaracao(
  token: string,
  env: string | null | undefined,
  meOrderId: string,
): Promise<MeCall<string>> {
  const r = await meCall<Record<string, string>>({
    token,
    env,
    path: `/api/v2/me/imprimir/dace/pdf/${encodeURIComponent(meOrderId)}`,
  });
  if (!r.ok) return r;
  const url = r.data && typeof r.data === "object" ? Object.values(r.data).find((v) => typeof v === "string") : null;
  if (!url) return { ok: false, message: "O Melhor Envio não devolveu o link da declaração." };
  return { ok: true, data: url };
}

/** Cancela e devolve o valor à Melhor Carteira. Só vale antes da postagem. */
export async function meCancelar(
  token: string,
  env: string | null | undefined,
  meOrderId: string,
  motivo = "2",
): Promise<MeCall<unknown>> {
  return meCall({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/shipment/cancel",
    body: { order: { id: meOrderId, reason_id: motivo, description: "Cancelado pelo painel da ALBIZIA" } },
  });
}

export type MeTracking = { status: string; trackingCode: string | null };

export async function meRastrear(
  token: string,
  env: string | null | undefined,
  meOrderIds: string[],
): Promise<MeCall<Record<string, MeTracking>>> {
  const r = await meCall<Record<string, { status?: string; tracking?: string | null }>>({
    token,
    env,
    method: "POST",
    path: "/api/v2/me/shipment/tracking",
    body: { orders: meOrderIds },
  });
  if (!r.ok) return r;
  const saida: Record<string, MeTracking> = {};
  for (const [id, v] of Object.entries(r.data ?? {})) {
    saida[id] = { status: v?.status ?? "", trackingCode: v?.tracking ?? null };
  }
  return { ok: true, data: saida };
}
