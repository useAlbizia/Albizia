import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Central Claude client for the store's AI features. The key lives only in the
// environment (never in code/git). claude-opus-5 gives the best brand-voice
// quality; swap MODEL if you want a cheaper model for high-volume features.
const MODEL = "claude-opus-5";

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
