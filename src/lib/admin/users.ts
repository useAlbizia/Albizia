"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/auth/admins";
import { adminCreateUser, adminListUsers, adminPromote, adminSetPassword } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendBrandedRecoveryEmail } from "@/lib/auth-email";
import { logAudit } from "@/lib/audit";

/** Admin pela lista de e-mails ou pela marca gravada na conta. */
async function ehAdministrador(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  const users = await adminListUsers();
  return !!users.find((u) => u.email.toLowerCase() === email.toLowerCase())?.admin;
}

export type CreateAdminState = {
  error?: string;
  success?: { email: string; password: string };
  /** Conta que já existia e só recebeu o acesso, com a mesma senha. */
  liberado?: string;
};

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
    // A marca que deixa a pessoa entrar no painel sem depender do
    // ADMIN_EMAILS da Vercel. Só o servidor consegue gravar app_metadata.
    app_metadata: { role: "admin" },
  });

  if (error) {
    // A conta já existe: um acesso criado antes desta marca existir (o caso
    // do Devid, criado em outubro e que nunca conseguiu entrar), ou alguém
    // que tinha conta de cliente. Quem está aqui é um admin pedindo,
    // deliberadamente, acesso ao painel para esse e-mail: a conta recebe a
    // marca e MANTÉM a senha. Trocar a senha aqui invalidaria a senha
    // provisória que já foi mandada para a pessoa.
    const users = await adminListUsers();
    const existente = users.find((u) => u.email.toLowerCase() === email.data.toLowerCase());
    if (!existente) return { error };

    const promovido = await adminPromote(existente.id);
    if (promovido.error) return { error: promovido.error };

    await logAudit({ action: "user.promote", entity: "user", entityId: email.data });
    return { liberado: email.data };
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
  if (!(await ehAdministrador(email.data))) return { error: "Este e-mail não é de um administrador." };

  const { ok, error } = await sendBrandedRecoveryEmail(email.data, "admin");
  if (!ok) return { error: error ?? "Não foi possível enviar agora. Tente de novo." };

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

  const users = await adminListUsers();
  const alvo = users.find((u) => u.email.toLowerCase() === email.data.toLowerCase());
  if (!alvo) return { error: "Usuário não encontrado no Supabase." };
  // Nunca redefinir a senha de um cliente por aqui: esta tela é só para
  // quem administra a loja.
  if (!alvo.admin) return { error: "Este e-mail não é de um administrador." };

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
