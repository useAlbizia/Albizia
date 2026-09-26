"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/auth/admins";
import { adminCreateUser, adminListUsers, adminSetPassword } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { logAudit } from "@/lib/audit";

export type CreateAdminState = { error?: string; success?: { email: string; password: string } };

function generateTempPassword() {
  return randomBytes(12).toString("base64url");
}

export async function createAdminUser(
  _prevState: CreateAdminState,
  formData: FormData
): Promise<CreateAdminState> {
  // Re-checked here even though the page that renders this form already
  // calls requireAdmin() — a page-level check doesn't protect the action
  // itself if it were ever called directly.
  await requireAdmin();

  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) {
    return { error: "E-mail inválido." };
  }

  const tempPassword = generateTempPassword();

  const { error } = await adminCreateUser({
    email: email.data,
    password: tempPassword,
    user_metadata: { must_change_password: true },
  });

  if (error) {
    return { error };
  }

  await logAudit({ action: "user.create", entity: "user", entityId: email.data });
  return { success: { email: email.data, password: tempPassword } };
}

export type ResetAdminState = {
  error?: string;
  sentTo?: string;
  tempPassword?: { email: string; password: string };
};

// Manda o link de recuperação para o próprio admin. Caminho preferido: a
// senha nasce e morre com a pessoa, ninguém mais vê. O link usa o domínio
// real da requisição (lib/site-url.ts), então não tem como cair em localhost.
export async function sendAdminResetLink(
  _prev: ResetAdminState,
  formData: FormData,
): Promise<ResetAdminState> {
  await requireAdmin();

  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "E-mail inválido." };
  if (!isAdminEmail(email.data)) return { error: "Este e-mail não é de um administrador." };

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/admin/redefinir`,
  });
  if (error) return { error: "Não foi possível enviar agora. Tente de novo." };

  await logAudit({ action: "user.reset_link", entity: "user", entityId: email.data });
  return { sentTo: email.data };
}

// Gera senha temporária e mostra UMA vez, aqui no painel. Existe para quando
// o e-mail não resolve (caixa cheia, spam, provedor bloqueando). Ela força a
// troca no primeiro login, então não vira senha definitiva de ninguém.
export async function resetAdminPassword(
  _prev: ResetAdminState,
  formData: FormData,
): Promise<ResetAdminState> {
  await requireAdmin();

  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "E-mail inválido." };
  if (!isAdminEmail(email.data)) return { error: "Este e-mail não é de um administrador." };

  const users = await adminListUsers();
  const alvo = users.find((u) => u.email.toLowerCase() === email.data.toLowerCase());
  if (!alvo) return { error: "Usuário não encontrado no Supabase." };

  const tempPassword = generateTempPassword();
  const { error } = await adminSetPassword({ userId: alvo.id, password: tempPassword });
  if (error) return { error };

  // Registra que houve reset, nunca o valor da senha.
  await logAudit({ action: "user.reset_password", entity: "user", entityId: email.data });
  return { tempPassword: { email: email.data, password: tempPassword } };
}

export type ChangePasswordState = { error?: string };

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem." });

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  await requireAdmin();

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { must_change_password: false },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}
