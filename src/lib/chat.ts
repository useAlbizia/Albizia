"use server";

import { assistantReply, type ChatMessage, type AiText } from "./ai";

// Public chat endpoint for the storefront assistant. Trims history + bounds
// message size before calling the model.
export async function chatAction(history: ChatMessage[]): Promise<AiText> {
  if (!Array.isArray(history)) return { error: "Mensagem inválida." };
  const trimmed = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  return assistantReply(trimmed);
}
