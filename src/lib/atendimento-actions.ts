"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { criarChamado, MOTIVOS, type Motivo } from "./chamados";
import { dentroDoLimite, quemPede } from "./limite";
import { registrarErro } from "./erros";

// Abertura de protocolo pelo site ou pelo chat. Quem grava é este formulário,
// com dados que o próprio cliente digitou: a IA do chat só sugere abrir, ela
// não tem como criar, mudar ou ler protocolo nenhum.

export type AberturaState =
  | { ok: true; numero: number; prazo: string }
  | { ok?: false; error?: string; campos?: Record<string, string>; valores?: Record<string, string> };

const schema = z.object({
  nome: z.string().trim().min(2, "Escreva seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(200),
  telefone: z.string().trim().max(30).optional().default(""),
  pedido: z
    .string()
    .trim()
    .max(12)
    .optional()
    .transform((v) => (v ? Number(v.replace(/\D/g, "")) || null : null)),
  motivo: z.enum(Object.keys(MOTIVOS) as [Motivo, ...Motivo[]], { message: "Escolha o assunto." }),
  mensagem: z.string().trim().min(10, "Conte um pouco mais do que aconteceu.").max(5000),
  conversa: z.string().max(20000).optional().default(""),
  origem: z.enum(["site", "chat"]).optional().default("site"),
});

export async function abrirChamado(_prev: AberturaState, fd: FormData): Promise<AberturaState> {
  // Campo invisível: gente não preenche, robô de spam preenche.
  if (String(fd.get("site") ?? "")) return { error: "Não foi possível enviar." };

  const bruto = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  // Devolve o que foi digitado: o formulário volta preenchido se der erro.
  const valores = { nome: bruto.nome ?? "", email: bruto.email ?? "", telefone: bruto.telefone ?? "", pedido: bruto.pedido ?? "", motivo: bruto.motivo ?? "", mensagem: bruto.mensagem ?? "" };
  const dados = schema.safeParse(bruto);
  if (!dados.success) {
    const campos: Record<string, string> = {};
    for (const i of dados.error.issues) campos[String(i.path[0])] ??= i.message;
    return { error: "Confira os campos destacados.", campos, valores };
  }

  const quem = await quemPede();
  if (!(await dentroDoLimite(`chamado:${quem}`, 5, 3600))) {
    return { valores, error: "Você já abriu vários protocolos agora há pouco. Se precisar acrescentar algo, responda o e-mail do protocolo." };
  }

  try {
    const d = dados.data;
    const c = await criarChamado({
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      pedidoNumero: d.pedido,
      motivo: d.motivo,
      mensagem: d.mensagem,
      conversa: d.conversa,
      origem: d.origem,
    });
    revalidatePath("/admin/atendimento");
    return {
      ok: true,
      numero: c.numero,
      prazo: c.prazoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" }),
    };
  } catch (err) {
    await registrarErro({
      origem: "servidor",
      area: "loja",
      gravidade: "critica",
      caminho: "abrir protocolo de atendimento",
      mensagem: `Cliente tentou abrir protocolo e falhou: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500),
    }).catch(() => {});
    return { valores, error: "Não conseguimos registrar agora. Tente de novo em instantes ou escreva para contato@usealbizia.com.br." };
  }
}
