import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db/client";

// Central Claude client for the store's AI features. The key lives only in the
// environment (never in code/git).
// - MODEL: best quality, for the low-volume admin description generator.
// - MODEL_FAST: Haiku — ~25x cheaper, for the high-volume customer-facing
//   features (search + chat), where near-zero cost per call matters more than
//   maximum quality. Note: Haiku 4.5 rejects output_config.effort, so the fast
//   calls omit it.
const MODEL = "claude-opus-5";
const MODEL_FAST = "claude-haiku-4-5";

let cached: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  cached ??= new Anthropic({ apiKey });
  return cached;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const BRAND_VOICE = `Você é redator da ALBIZIA, marca brasileira de moda masculina premium — estética "quiet luxury" (luxo silencioso): peças essenciais, atemporais, de alto padrão. A marca se inspira na árvore albízia, que recolhe as folhas ao anoitecer; o mote é "Silence becomes style".

Escreva descrições de produto em português do Brasil que sejam:
- Curtas: 2 a 3 frases (no máximo ~45 palavras).
- Sensoriais e precisas: destaque tecido, caimento e uso — sem exagero.
- Sofisticadas e contidas: sem gírias, sem pontos de exclamação, sem clichês de e-commerce ("imperdível", "must-have"), sem promessas vazias.
- Focadas na peça, não no cliente.

Responda apenas com a descrição — sem título, aspas ou comentários.`;

export type AiText = { text: string } | { error: string };

// Extracts the plain text from a Claude response (ignores thinking blocks).
function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export async function generateProductDescription(input: {
  name: string;
  category: string;
  collection: string;
  fabric: string;
}): Promise<AiText> {
  const client = getClient();
  if (!client) return { error: "IA não configurada (ANTHROPIC_API_KEY ausente)." };

  const categoria = input.category === "moda-praia" ? "short de praia" : "camiseta";
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: BRAND_VOICE,
      messages: [
        {
          role: "user",
          content: `Escreva a descrição para esta peça:
- Produto: ${input.name}
- Tipo: ${categoria}
- Coleção: ${input.collection}
- Tecido: ${input.fabric}`,
        },
      ],
    });
    const text = textOf(res);
    if (!text) return { error: "A IA não retornou texto. Tente novamente." };
    return { text };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: "Chave de IA inválida. Verifique a ANTHROPIC_API_KEY." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { error: "Limite de uso da IA atingido. Tente em instantes." };
    }
    console.error("generateProductDescription failed", err);
    return { error: "Não foi possível gerar agora. Tente novamente." };
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

// The storefront concierge/assistant. Recommends real products, answers size/
// shipping/returns/payment questions, in the brand voice. History is trimmed to
// the last turns to bound cost.
export async function assistantReply(history: ChatMessage[]): Promise<AiText> {
  const client = getClient();
  if (!client) return { error: "Assistente indisponível no momento." };
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { error: "Envie uma mensagem." };
  }

  const rows = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.active, true),
    with: { collection: true, images: { limit: 1 } },
  });
  const catalog = rows
    .filter((r) => r.images.length > 0)
    .map(
      (r) =>
        `- ${r.name} — cor ${r.colorName}, ${r.category}, R$${(r.priceCents / 100).toFixed(0)} → /produto/${r.slug}`
    )
    .join("\n");

  const system = `Você é a assistente virtual da ALBIZIA — marca brasileira de moda masculina premium ("quiet luxury": peças essenciais, atemporais, de alto padrão). Fale em português do Brasil, de forma cordial, breve e sofisticada (sem gírias, sem exageros, sem pontos de exclamação em excesso).

Você ajuda o cliente a encontrar peças, tirar dúvidas e recomendar produtos do catálogo abaixo. Ao sugerir uma peça, cite o nome e inclua o link exatamente como está (ex.: /produto/camiseta-essential-preta) para o cliente clicar. Recomende SOMENTE produtos do catálogo.

CATÁLOGO:
${catalog}

INFORMAÇÕES DA LOJA:
- Tamanhos: P, M, G, GG (há um "Guia de tamanhos" em cada página de produto).
- Pagamento: Pix e cartão, via Mercado Pago.
- Frete: calculado no checkout (por CEP ou taxa fixa), podendo haver frete grátis acima de um valor.
- Trocas e devoluções: até 7 dias após o recebimento (direito de arrependimento).
- Acompanhar pedido: página "Acompanhar" com número do pedido e e-mail.

Se perguntarem algo fora do universo da loja, responda com gentileza e traga a conversa de volta às peças. Mantenha as respostas curtas (2 a 4 frases).`;

  try {
    const res = await client.messages.create({
      model: MODEL_FAST,
      max_tokens: 800,
      system,
      messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    });
    const text = textOf(res);
    return text ? { text } : { error: "Não consegui responder agora. Tente novamente." };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { error: "Muitas mensagens agora. Tente em instantes." };
    console.error("assistantReply failed", err);
    return { error: "Não consegui responder agora. Tente novamente." };
  }
}

// Semantic product search: Claude reads the (small) catalog and the shopper's
// natural query and returns the most relevant product slugs, best first.
// Returns null when AI is unavailable so the caller can fall back to text match.
export async function aiSearchProducts(query: string): Promise<string[] | null> {
  const client = getClient();
  if (!client || !query.trim()) return null;

  const rows = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.active, true),
    with: { collection: true, images: { limit: 1 } },
  });
  const catalog = rows
    .filter((r) => r.images.length > 0)
    .map((r) => ({
      slug: r.slug,
      nome: r.name,
      tipo: r.category,
      colecao: r.collection.slug,
      cor: r.colorName,
      preco: r.priceCents / 100,
      desc: r.description,
    }));
  if (catalog.length === 0) return null;

  try {
    const res = await client.messages.create({
      model: MODEL_FAST,
      max_tokens: 500,
      system:
        'Você é a busca inteligente da loja de moda ALBIZIA. Dada a consulta do cliente e o catálogo (JSON), devolva os slugs dos produtos RELEVANTES, do mais ao menos relevante, considerando cor, tipo de peça, ocasião, clima e estilo. Inclua só o que faz sentido para a consulta (pode ser vazio). Responda SOMENTE com um array JSON de slugs, ex.: ["slug-a","slug-b"].',
      messages: [
        { role: "user", content: `Consulta: "${query}"\n\nCatálogo:\n${JSON.stringify(catalog)}` },
      ],
    });
    const text = textOf(res);
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed)) return null;
    const valid = new Set(catalog.map((c) => c.slug));
    return parsed.filter((s): s is string => typeof s === "string" && valid.has(s));
  } catch (err) {
    console.error("aiSearchProducts failed", err);
    return null;
  }
}
