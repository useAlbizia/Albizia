"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { adminCreateUser } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
