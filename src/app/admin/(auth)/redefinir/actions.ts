"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { traduzirErroNovaSenha } from "@/lib/auth-erros";

export type NewPasswordState = { error?: string };

// Runs after the recovery link established a session (via code exchange on
// the page). Sets the new password and clears the must-change flag.
export async function setNewPassword(
  _prev: NewPasswordState,
  formData: FormData
): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "O link de recuperação expirou ou já foi usado. Peça um novo em \"Esqueci a senha\"." };

  const { error } = await supabase.auth.updateUser({
    password,
    data: { must_change_password: false },
  });
  // Antes devolvia a mensagem crua do Supabase, em inglês.
  if (error) return { error: traduzirErroNovaSenha(error) };

  redirect("/admin");
}
