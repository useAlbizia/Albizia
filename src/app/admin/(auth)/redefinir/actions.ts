"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (!user) return { error: "Link expirado. Solicite um novo." };

  const { error } = await supabase.auth.updateUser({
    password,
    data: { must_change_password: false },
  });
  if (error) return { error: error.message };

  redirect("/admin");
}
