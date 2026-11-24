"use server";

import { type ChatMessage, type ChatReply } from "./ai";
import { assistantReply } from "./assistente";
import { dentroDoLimite, quemPede } from "./limite";

// Public chat endpoint for the storefront assistant. Trims history + bounds
// message size before calling the model.
//
// Cada mensagem custa dinheiro na Anthropic, e este endereço é público:
// sem limite, um robô mandando mensagem sem parar gastaria o crédito todo.
// Por pessoa: 20 mensagens a cada 10 minutos e 120 por dia (cliente de
// verdade não chega perto). Para a loja inteira: 3.000 por dia.
export async function chatAction(history: ChatMessage[], formularioAberto = false): Promise<ChatReply> {
  if (!Array.isArray(history)) return { error: "Mensagem inválida." };
  const quem = await quemPede();
  const [curto, dia, loja] = await Promise.all([
    dentroDoLimite(`chat:${quem}`, 20, 600),
    dentroDoLimite(`chat-dia:${quem}`, 120, 86400),
    dentroDoLimite("chat-loja", 3000, 86400),
  ]);
  if (!curto) return { error: "Você mandou muitas mensagens seguidas. Espere alguns minutos e continue, por favor." };
  if (!dia || !loja) {
    return { error: "O chat atingiu o limite de hoje. Para falar com a equipe, abra um protocolo em /atendimento." };
  }
  const trimmed = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  return assistantReply(trimmed, formularioAberto === true);
}
