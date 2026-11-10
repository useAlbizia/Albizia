"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendBrandedRecoveryEmail } from "@/lib/auth-email";
import { traduzirErroLogin } from "@/lib/auth-erros";
import { isAdminEmail } from "@/lib/auth/admins";
import { adminListUsers } from "@/lib/supabase/admin";

export type LoginState = { error?: string; sugerirRecuperar?: boolean; email?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // O e-mail volta para a tela: sem isso o campo esvaziava a cada erro e a
  // pessoa tinha que digitar tudo de novo.
  if (error) return { ...traduzirErroLogin(error), email };

  redirect("/admin");
}

export type ResetState = { ok?: boolean; error?: string };

/**
 * "Esqueci a senha" da tela de login do painel.
 *
 * Usa o e-mail com a cara da ALBIZIA (lib/auth-email.ts), o mesmo dos
 * clientes. Antes esta tela chamava o envio padrão do Supabase, que chega em
 * inglês, de remetente desconhecido e parecendo golpe: era o único lugar que
 * tinha ficado para trás.
 *
 * Só envia para quem é administrador; a resposta é sempre a mesma, para a
 * tela não servir de consulta de quais e-mails têm acesso ao painel.
 */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Informe o e-mail." };

  let admin = isAdminEmail(email);
  if (!admin) {
    const users = await adminListUsers().catch(() => []);
    admin = !!users.find((u) => u.email.toLowerCase() === email)?.admin;
  }

  if (admin) {
    const r = await sendBrandedRecoveryEmail(email, "admin").catch((e) => ({ ok: false, error: String(e) }));
    if (!r.ok) console.error("Recuperação do painel falhou", r.error);
  }
  return { ok: true };
}
