import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db/client";
import { registrarErro } from "./erros";
import { getSiteSettings } from "./settings";

// Quando o assistente não consegue responder, o cliente recebe um caminho
// real (o e-mail da loja) em vez de "tente novamente", e a falha vai para
// Erros do sistema: chave inválida ou crédito acabado é problema NOSSO.
export async function chatForaDoAr(motivo: string): Promise<AiText> {
  await registrarErro({
    origem: "servidor",
    area: "loja",
    gravidade: "alta",
    caminho: "chat da loja (assistente)",
    mensagem: `O assistente do site não respondeu: ${motivo}`.slice(0, 500),
  }).catch(() => {});
  const contato = (await getSiteSettings().catch(() => null))?.contactEmail || "contato@usealbizia.com.br";
  return { error: `Nosso assistente está fora do ar agora. Fale com a gente pelo e-mail ${contato} que respondemos rapidinho.` };
}

// Central Claude client for the store's AI features. The key lives only in the
// environment (never in code/git).
// - MODEL: best quality, for the low-volume admin description generator.
// - MODEL_FAST: Claude Haiku 5.5, for the high-volume customer-facing
//   features (chat + search + insight): melhor e mais barato que o Haiku 4.5
//   (US$ 0,10 / 0,50 por milhão de tokens). Roda com effort "low": resposta
//   rápida importa mais que raciocínio longo nessas telas.
const MODEL = "claude-opus-5";
export const MODEL_FAST = "claude-haiku-5-5";

let cached: Anthropic | null = null;
export function clienteClaude(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  cached ??= new Anthropic({ apiKey });
  return cached;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const BRAND_VOICE = `Você é redator da ALBIZIA, marca brasileira de moda masculina premium, de estética "quiet luxury" (luxo silencioso): peças essenciais, atemporais, de alto padrão. A marca se inspira na árvore albízia, que recolhe as folhas ao anoitecer; o mote é "Silence becomes style".

Escreva descrições de produto em português do Brasil que sejam:
- Curtas: 2 a 3 frases (no máximo ~45 palavras).
- Sensoriais e precisas: destaque tecido, caimento e uso, sem exagero.
- Sofisticadas e contidas: sem gírias, sem pontos de exclamação, sem clichês de e-commerce ("imperdível", "must-have"), sem promessas vazias.
- Naturais e humanas: nunca use travessões (—). Prefira vírgulas, pontos ou dois-pontos.
- Focadas na peça, não no cliente.

Responda apenas com a descrição, sem título, aspas ou comentários.`;

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
  const client = clienteClaude();
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

// A short, plain-language reading of the analytics for the founders (for ads &
// improvements). Uses the cheap model; returns "" if unavailable.
export async function analyticsInsight(data: unknown): Promise<string> {
  const client = clienteClaude();
  if (!client) return "";
  try {
    const res = await client.messages.create({
      model: MODEL_FAST,
      max_tokens: 1000,
      output_config: { effort: "low" },
      system:
        "Você é analista de dados de uma loja de moda (ALBIZIA). Receberá métricas de tráfego em JSON. Escreva em português do Brasil um resumo curto e objetivo (2 a 4 frases) com o que os dados dizem e 1 sugestão prática para anúncios ou melhoria. Sem saudação, sem travessões, sem repetir todos os números, apenas o que importa. Se os dados forem escassos, diga que ainda há poucos dados.",
      messages: [{ role: "user", content: JSON.stringify(data) }],
    });
    return textOf(res);
  } catch {
    return "";
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Limpeza determinística da resposta do assistente.
//
// Existe porque pedir no prompt não basta: em teste, o modelo usou travessão
// mesmo com a proibição escrita, e devolveu **negrito** em markdown. O widget
// do chat não renderiza markdown (só transforma link de produto), então o
// asterisco chegaria literal na tela do cliente. Regra que precisa valer
// sempre vira código, não pedido.
export function sanitizeReply(text: string): string {
  return (
    text
      // Markdown que o widget não renderiza.
      .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
      .replace(/__([\s\S]+?)__/g, "$1")
      // Travessão e meia-risca viram vírgula, que é como a marca escreve.
      .replace(/[ \t]*[—–][ \t]*/g, ", ")
      // Sobras da troca acima.
      .replace(/,\s*,/g, ",")
      .replace(/[ \t]{2,}/g, " ")
      // Só espaços horizontais: a quebra de linha separa parágrafos no chat.
      .replace(/[ \t]+\n/g, "\n")
      .trim()
  );
}

// O assistente do chat da loja fica em ./assistente.ts.

// Semantic product search: Claude reads the (small) catalog and the shopper's
// natural query and returns the most relevant product slugs, best first.
// Returns null when AI is unavailable so the caller can fall back to text match.
export async function aiSearchProducts(query: string): Promise<string[] | null> {
  const client = clienteClaude();
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
      max_tokens: 1000,
      output_config: { effort: "low" },
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
